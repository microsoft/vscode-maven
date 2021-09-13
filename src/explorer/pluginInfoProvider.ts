// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { fetchPluginMetadataXml } from "../utils/requestUtils";
import { Utils } from "../utils/Utils";

const KEY_PLUGINS: string = "plugins";

interface IPluginCache {
    [groupId: string]: {
        [artifactId: string]: IPluginInfo
    };
}

interface IPluginInfo {
    prefix?: string;
    versions?: {
        [version: string]: string[] // goals
    };
}

class PluginInfoProvider {
    private _context: vscode.ExtensionContext;

    public initialize(context: vscode.ExtensionContext): void {
        this._context = context;
    }

    public async getPluginPrefix(gid: string, aid: string): Promise<string | undefined> {
        const infos: {[aid: string]: IPluginInfo} = _.get(this.getPluginCache(), [gid]) ?? {};
        const info: IPluginInfo = _.get(infos, [aid]) ?? {};
        if (info.prefix !== undefined) {
            return info.prefix;
        }

        const metadataXml = await fetchPluginMetadataXml(gid);
        const xml: any = await Utils.parseXmlContent(metadataXml);
        const plugins: any[] = _.get(xml, "metadata.plugins[0].plugin");
        plugins.forEach(plugin => {
            const a: string = _.get(plugin, "artifactId[0]");
            const p: string = _.get(plugin, "prefix[0]");
            infos[a] = infos[a] ?? {};
            infos[a].prefix = p;
        });
        await this.cachePluginInfos(gid, infos);
        return infos[aid]?.prefix;
    }

    public async getPluginGoals(pomPath: string, groupId: string, artifactId: string, version: string): Promise<string[] | undefined> {
        const infos: {[aid: string]: IPluginInfo} = _.get(this.getPluginCache(), [groupId]) ?? {};
        const info: IPluginInfo = _.get(infos, [artifactId]) ?? {};
        info.versions = info.versions ?? {};
        const goalsFromCache: string[] | undefined = _.get(info.versions, [version]);
        if (goalsFromCache !== undefined) {
            return goalsFromCache;
        }

        const {prefix, goals} = await this.fetchFromRepository(pomPath, groupId, artifactId, version);
        info.prefix = info.prefix ?? prefix;
        info.versions[version] = goals ?? [];

        await this.cachePluginInfo(groupId, artifactId, info);
        return goals;
    }

    private getPluginCache(): IPluginCache {
        return this._context.globalState.get(KEY_PLUGINS) ?? {};
    }

    private async cachePluginInfos(gid: string, infos: {[aid: string]: IPluginInfo}): Promise<void> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS) ?? {};
        _.set(plugins, [gid], infos);
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async cachePluginInfo(gid: string, aid: string, info: IPluginInfo): Promise<void> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS) ?? {};
        _.set(plugins, [gid, aid], info);
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async fetchFromRepository(projectBasePath: string, gid: string, aid: string, version?: string): Promise<{prefix?: string, goals?: string[]}> {
        let prefix: string | undefined;
        const goals: string[] = [];
        const textOutput: string = await Utils.getPluginDescription(this.getPluginId(gid, aid, version), projectBasePath);

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
