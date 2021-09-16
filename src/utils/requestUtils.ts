// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as http from "http";
import * as https from "https";
import * as _ from "lodash";
import * as path from "path";
import * as url from "url";

const URL_MAVEN_SEARCH_API: string = "https://search.maven.org/solrsearch/select";
const URL_MAVEN_CENTRAL_REPO: string = "https://repo1.maven.org/maven2/";
const MAVEN_METADATA_FILENAME: string = "maven-metadata.xml";

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

export async function getArtifacts(keywords: string[]): Promise<IArtifactMetadata[]> {
    // Remove short keywords
    const validKeywords: string[] = keywords.filter(keyword => keyword.length >= 3);
    if (validKeywords.length === 0) {
        return [];
    }

    const params: any = {
        q: validKeywords.join(" ").trim(),
        rows: 50,
        wt: "json"
    };
    const raw: string = await httpsGet(`${URL_MAVEN_SEARCH_API}?${toQueryString(params)}`);
    try {
        return _.get(JSON.parse(raw), "response.docs", []);
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getVersions(gid: string, aid: string): Promise<IVersionMetadata[]> {
    const params: any = {
        q: `g:"${gid}" AND a:"${aid}"`,
        core: "gav",
        rows: 50,
        wt: "json"
    };
    const raw: string = await httpsGet(`${URL_MAVEN_SEARCH_API}?${toQueryString(params)}`);
    try {
        return _.get(JSON.parse(raw), "response.docs", []);
    } catch (error) {
        console.error(error);
        return [];
    }
}

export async function getLatestVersion(gid: string, aid: string): Promise<string | undefined> {
    try {
        const params: any = {
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

async function httpsGet(urlString: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let result: string = "";
        https.get(url.parse(urlString), (res: http.IncomingMessage) => {
            res.on("data", chunk => {
                result = result.concat(chunk.toString());
            });
            res.on("end", () => {
                resolve(result);
            });
            res.on("error", err => {
                reject(err);
            });
        });
    });
}

async function httpsGetStatusCode(uriString: string): Promise<number | undefined> {
    return new Promise<number | undefined>((resolve, _reject) => {
        https.get(url.parse(uriString), (res: http.IncomingMessage) => {
            resolve(res.statusCode);
        });
    });
}

function toQueryString(params: { [key: string]: any }): string {
    return Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k].toString())}`).join("&");
}

export async function fetchPluginMetadataXml(gid: string): Promise<string> {
    const metadataUrl = URL_MAVEN_CENTRAL_REPO + path.posix.join(...gid.split("."), MAVEN_METADATA_FILENAME);
    return await httpsGet(metadataUrl);
}

function mavenDistributionUrl(mavenVersion: string): string {
    return `https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/${mavenVersion}`;
}

export async function mavenDitributionExisting(mavenVersion: string): Promise<boolean> {
    const statusCode = await httpsGetStatusCode(mavenDistributionUrl(mavenVersion));
    return statusCode !== 404;
}