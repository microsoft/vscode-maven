// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { Utils } from "../utils/Utils";

const KEY_PLUGINS: string = "plugins";

interface IPluginInfo {
    prefix?: string;
    goals?: string[];
}

class PluginInfoProvider {
    private _context: vscode.ExtensionContext;

    public initialize(context: vscode.ExtensionContext): void {
        this._context = context;
    }

    public async getPluginInfo(projectBasePath: string, gid: string, aid: string, version: string): Promise<IPluginInfo> {
        const cachedResult: IPluginInfo | undefined = await this.getFromLocalCache(gid, aid, version);
        if (cachedResult) {
            return cachedResult;
        }

        const latestResult: IPluginInfo = await this.fetchFromRepository(projectBasePath, gid, aid, version);
        await this.saveToLocalCache(gid, aid, version, latestResult);
        return latestResult;
    }

    public async clearPluginInfo(gid: string, aid: string, version: string): Promise<void> {
        await this.saveToLocalCache(gid, aid, version, undefined);
    }

    private async getFromLocalCache(gid: string, aid: string, version: string): Promise<IPluginInfo | undefined> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS);
        return _.get(plugins, [gid, aid, version]);
    }

    private async saveToLocalCache(gid: string, aid: string, version: string, pluginInfo: IPluginInfo | undefined): Promise<void> {
        let plugins: any = this._context.globalState.get(KEY_PLUGINS);
        if (!plugins) {
            plugins = {};
        }
        _.set(plugins, [gid, aid, version], pluginInfo);
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async fetchFromRepository(projectBasePath: string, gid: string, aid: string, version?: string): Promise<IPluginInfo> {
        let prefix: string | undefined;
        const goals: string[] = [];
        const rawOutput: string = await Utils.getPluginDescription(this.getPluginId(gid, aid, version), projectBasePath);

        // Remove ANSI escape code: ESC[m, ESC[1m
        // To fix: https://github.com/microsoft/vscode-maven/issues/340#issuecomment-511125457
        const escChar: string = Buffer.from([0x1b]).toString();
        const textOutput: string = rawOutput.replace(new RegExp(`${escChar}\\[\\d*?m`, "g"), "");

        const versionRegExp: RegExp = /^Version: (.*)/m;
        const versionMatch: string[] | null = textOutput.match(versionRegExp);
        if (versionMatch !== null && versionMatch.length === 2) {
            version = versionMatch[1];
        }

        // find prefix
        const prefixRegExp: RegExp = /^Goal Prefix: (.*)/m;
        const prefixMatch: string[] | null = textOutput.match(prefixRegExp);
        if (prefixMatch !== null && prefixMatch.length === 2) {
            prefix = prefixMatch[1];
        }

        // find goals
        if (version && prefix !== undefined) {
            const goalRegExp: RegExp = new RegExp(`^${prefix}:(.*)`, "gm");
            const goalsMatch: string[] | null = textOutput.match(goalRegExp);
            if (goalsMatch !== null) {
                goals.push(...goalsMatch);
            }
        }

        return { prefix, goals };
    }

    private getPluginId(gid: string, aid: string, version?: string): string {
        return `${gid}:${aid}${version ? `:${version}` : ""}`;
    }
}

export const pluginInfoProvider: PluginInfoProvider = new PluginInfoProvider();
