// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as http from "http";
import * as https from "https";
import * as url from "url";

const URL_BASIC_SEARCH: string = "https://search.maven.org/solrsearch/select";

export async function getArtifacts(keyword: string): Promise<{}> {
    const params: any = {
        q: keyword,
        rows: 20,
        wt: "json"
    };
    const raw: string = await httpsGet(`${URL_BASIC_SEARCH}?${toQueryString(params)}`);
    return JSON.parse(raw);
}

export async function getVersions(gid: string, aid: string): Promise<{}> {
    const params: any = {
        q: `g:"${gid}" AND a:"${aid}"`,
        core: "gav",
        rows: 50,
        wt: "json"
    };
    const raw: string = await httpsGet(`${URL_BASIC_SEARCH}?${toQueryString(params)}`);
    return JSON.parse(raw);
}

function httpsGet(urlString: string): Promise<string> {
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

function toQueryString(params: {[key: string]: any}): string {
    return Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k].toString())}`).join("&");
}
