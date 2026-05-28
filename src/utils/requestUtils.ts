// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as http from "http";
import * as https from "https";
import * as _ from "lodash";
import * as path from "path";
import * as url from "url";
import * as vscode from "vscode";

const URL_MAVEN_SEARCH_API = "https://search.maven.org/solrsearch/select";
const URL_MAVEN_CENTRAL_REPO = "https://repo1.maven.org/maven2/";
const MAVEN_METADATA_FILENAME = "maven-metadata.xml";
const HTTPS_GET_TIMEOUT_MS = 10_000;

/**
 * Error thrown when an httpsGet call is aborted because its CancellationToken
 * was cancelled (e.g. the user kept typing, so VS Code superseded the previous
 * completion request). Callers should swallow this silently — it is not a
 * real failure.
 */
class CancellationError extends Error {
    constructor() {
        super("Cancelled");
        this.name = "CancellationError";
    }
}

function isCancellation(error: unknown): boolean {
    return error instanceof CancellationError;
}

export interface IArtifactMetadata {
    id: string;
    g: string;
    a: string;
    latestVersion: string;
    versionCount: number;
    p: string;
}

export interface IVersionMetadata {
    id: string;
    g: string;
    a: string;
    v: string;
    timestamp: number;
}

export async function getArtifacts(keywords: string[], token?: vscode.CancellationToken): Promise<IArtifactMetadata[]> {
    // Remove short keywords
    const validKeywords: string[] = keywords.filter(keyword => keyword.length >= 3);
    if (validKeywords.length === 0) {
        return [];
    }

    const params = {
        q: validKeywords.join(" ").trim(),
        rows: 50,
        wt: "json"
    };
    try {
        const raw: string = await httpsGet(`${URL_MAVEN_SEARCH_API}?${toQueryString(params)}`, token);
        return _.get(JSON.parse(raw), "response.docs", []);
    } catch (error) {
        if (!isCancellation(error)) {
            console.error(error);
        }
        return [];
    }
}

export async function getVersions(gid: string, aid: string, token?: vscode.CancellationToken): Promise<IVersionMetadata[]> {
    const params = {
        q: `g:"${gid}" AND a:"${aid}"`,
        core: "gav",
        rows: 50,
        wt: "json"
    };
    try {
        const raw: string = await httpsGet(`${URL_MAVEN_SEARCH_API}?${toQueryString(params)}`, token);
        return _.get(JSON.parse(raw), "response.docs", []);
    } catch (error) {
        if (!isCancellation(error)) {
            console.error(error);
        }
        return [];
    }
}

export async function getLatestVersion(gid: string, aid: string): Promise<string | undefined> {
    try {
        const params = {
            q: `g:"${gid}" AND a:"${aid}"`,
            rows: 1,
            wt: "json"
        };
        const raw: string = await httpsGet(`${URL_MAVEN_SEARCH_API}?${toQueryString(params)}`);
        return _.get(JSON.parse(raw), "response.docs[0].latestVersion");
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

async function httpsGet(urlString: string, token?: vscode.CancellationToken): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        if (token?.isCancellationRequested) {
            reject(new CancellationError());
            return;
        }

        let result = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const options: any = url.parse(urlString);
        options.headers = {
            'User-Agent': 'vscode-maven/0.1'
        };
        options.timeout = HTTPS_GET_TIMEOUT_MS;

        let settled = false;
        let cancelSub: vscode.Disposable | undefined;
        const settle = (fn: () => void) => {
            if (settled) {
                return;
            }
            settled = true;
            cancelSub?.dispose();
            fn();
        };

        const req = https.get(options, (res: http.IncomingMessage) => {
            res.on("data", chunk => {
                result = result.concat(chunk.toString());
            });
            res.on("end", () => {
                settle(() => resolve(result));
            });
            res.on("error", err => {
                settle(() => reject(err));
            });
        });

        req.on("timeout", () => {
            req.destroy(new Error(`HTTPS request to ${urlString} timed out after ${HTTPS_GET_TIMEOUT_MS}ms`));
        });
        req.on("error", err => {
            settle(() => reject(err));
        });

        if (token) {
            cancelSub = token.onCancellationRequested(() => {
                req.destroy(new CancellationError());
            });
            // Defensive: if the request errored synchronously before we got
            // here, `settled` is already true and the listener above would
            // never be disposed. Drop it now in that case.
            if (settled) {
                cancelSub.dispose();
                cancelSub = undefined;
            }
        }
    });
}

function toQueryString(params: { [key: string]: number | string }): string {
    return Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k].toString())}`).join("&");
}

export async function fetchPluginMetadataXml(gid: string): Promise<string> {
    const metadataUrl = URL_MAVEN_CENTRAL_REPO + path.posix.join(...gid.split("."), MAVEN_METADATA_FILENAME);
    return await httpsGet(metadataUrl);
}
