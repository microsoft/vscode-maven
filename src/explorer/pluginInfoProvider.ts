// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { getMavenLocalRepository } from "../utils/contextUtils";
import { readContentFromJar } from "../utils/jarUtils";
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

interface PluginInfoDict {
    [artifactId: string]: IPluginInfo;
}

interface PluginDescription {
    goalPrefix: string;
    goals: string[];
}

class PluginInfoProvider {
    private _context: vscode.ExtensionContext;

    public initialize(context: vscode.ExtensionContext): void {
        this._context = context;
    }

    public async getPluginPrefix(gid: string, aid: string): Promise<string | undefined> {
        // read from cache if exists
        const infos: PluginInfoDict = _.get(this.getPluginCache(), [gid]) ?? {};
        const info: IPluginInfo = _.get(infos, [aid]) ?? {};
        if (info.prefix !== undefined) {
            return info.prefix;
        }

        // get prefix from central/groupId/maven-metadata.xml
        const metadataXml = await fetchPluginMetadataXml(gid);
        const xml: any = await Utils.parseXmlContent(metadataXml);
        const plugins: any[] = _.get(xml, "metadata.plugins[0].plugin");
        plugins.forEach(plugin => {
            const a: string = _.get(plugin, "artifactId[0]");
            const p: string = _.get(plugin, "prefix[0]");
            infos[a] = infos[a] ?? {};
            infos[a].prefix = p;
        });

        // update cache
        await this.udpatePluginInfoCache(gid, infos);
        return infos[aid]?.prefix;
    }

    public async getPluginGoals(pomPath: string, groupId: string, artifactId: string, version: string): Promise<string[] | undefined> {
        // read from cache if exists
        const infos: PluginInfoDict = _.get(this.getPluginCache(), [groupId]) ?? {};
        const info: IPluginInfo = _.get(infos, [artifactId]) ?? {};
        info.versions = info.versions ?? {};
        const goalsFromCache: string[] | undefined = _.get(info.versions, [version]);
        if (goalsFromCache !== undefined) {
            return goalsFromCache;
        }

        // Read from `jar!META-INF/maven/plugin.xml` if plugin.jar is available in local repository.
        // See https://github.com/microsoft/vscode-maven/issues/895
        const desc: PluginDescription | undefined = await parseMetadataFromJar(groupId, artifactId, version);
        if (desc) {
            info.prefix = desc.goalPrefix;
            info.versions[version] = desc.goals;
        } else {
            // get plugin goals using maven-help-plugin, i.e. mvn help:describe
            const { prefix, goals } = await this.parseFromPluginDescription(pomPath, groupId, artifactId, version);
            info.prefix = info.prefix ?? prefix;
            info.versions[version] = goals ?? [];
        }

        // update cache
        await this.cachePluginInfo(groupId, artifactId, info);
        return info.versions[version];
    }

    private getPluginCache(): IPluginCache {
        return this._context.globalState.get(KEY_PLUGINS) ?? {};
    }

    private async udpatePluginInfoCache(gid: string, infos: PluginInfoDict): Promise<void> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS) ?? {};
        _.set(plugins, [gid], infos);
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async cachePluginInfo(gid: string, aid: string, info: IPluginInfo): Promise<void> {
        const plugins: any = this._context.globalState.get(KEY_PLUGINS) ?? {};
        _.set(plugins, [gid, aid], info);
        await this._context.globalState.update(KEY_PLUGINS, plugins);
    }

    private async parseFromPluginDescription(projectBasePath: string, gid: string, aid: string, version?: string): Promise<{ prefix?: string, goals?: string[] }> {
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
                // prefix:goal matched, remove "prefix:" part
                goals.push(...goalsMatch.map(fullGoal => fullGoal.slice(prefix!.length + 1)));
            }
        }

        return { prefix, goals };
    }

    private getPluginId(gid: string, aid: string, version?: string): string {
        return `${gid}:${aid}${version ? `:${version}` : ""}`;
    }
}

export const pluginInfoProvider: PluginInfoProvider = new PluginInfoProvider();

async function parseMetadataFromJar(groupId: string, artifactId: string, version: string): Promise<PluginDescription | undefined> {
    const jarFilePath = path.join(getMavenLocalRepository(), ...groupId.split("."), artifactId, version, `${artifactId}-${version}.jar`);
    try {
        await fs.promises.access(jarFilePath);
        const jarUri = vscode.Uri.file(jarFilePath);
        const segs = "META-INF/maven/plugin.xml".split("/");

        const xml = await readContentFromJar(jarUri, ...segs);
        const xmlObj = xml && await Utils.parseXmlContent(xml);
        const goalPrefix: any = _.get(xmlObj, "plugin.goalPrefix[0]");
        const mojos = _.get(xmlObj, "plugin.mojos[0].mojo");
        const goals = mojos ? (mojos as any[]).map(m => m.goal[0]) : [];
        return {
            goalPrefix,
            goals
        }
    } catch (error) {
        return undefined;
    }

}
