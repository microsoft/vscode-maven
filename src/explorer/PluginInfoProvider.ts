// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { Utils } from "../Utils";

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
        const cachedResult: IPluginInfo = await this.getFromLocalCache(gid, aid, version);
        if (cachedResult) {
            return cachedResult;
        }

        const latestResult: IPluginInfo = await this.fetchFromRepository(projectBasePath, gid, aid, version);
        await this.saveToLocalCache(gid, aid, version, latestResult);
        return latestResult;
    }

    private async getFromLocalCache(gid: string, aid: string, version: string): Promise<IPluginInfo> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS);
        return _.get(plugins, [gid, aid, version]);
    }

    private async saveToLocalCache(gid: string, aid: string, version: string, pluginInfo: IPluginInfo): Promise<void> {
        let plugins: any = this._context.globalState.get(KEY_PLUGINS);
        if (!plugins) {
            plugins = {};
        }
        if (!plugins[gid]) {
            plugins[gid] = {};
        }
        if (!plugins[gid][aid]) {
            plugins[gid][aid] = {};
        }
        plugins[gid][aid][version] = pluginInfo;
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async fetchFromRepository(projectBasePath: string, gid: string, aid: string, version?: string): Promise<IPluginInfo> {
        let prefix: string;
        const goals: string[] = [];
        const rawOutput: string = await Utils.getPluginDescription(this.pluginId(gid, aid, version), projectBasePath);

        const versionRegExp: RegExp = /^Version: (.*)/m;
        const versionMatch: string[] = rawOutput.match(versionRegExp);
        if (versionMatch && versionMatch.length === 2) {
            version = versionMatch[1];
        }

        // find prefix
        const prefixRegExp: RegExp = /^Goal Prefix: (.*)/m;
        const prefixMatch: string[] = rawOutput.match(prefixRegExp);
        if (prefixMatch && prefixMatch.length === 2) {
            prefix = prefixMatch[1];
        }

        // find goals
        if (version && prefix) {
            const goalRegExp: RegExp = new RegExp(`^${prefix}:(.*)`, "gm");
            const goalsMatch: string[] = rawOutput.match(goalRegExp);
            if (goalsMatch) {
                goals.push(...goalsMatch);
            }
        }

        return { prefix, goals };
    }

    private pluginId(gid: string, aid: string, version?: string): string {
        return `${gid}:${aid}${version ? `:${version}` : ""}`;
    }
}

// tslint:disable-next-line:export-name
export const pluginInfoProvider: PluginInfoProvider = new PluginInfoProvider();
