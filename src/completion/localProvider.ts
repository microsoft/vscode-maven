// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { COMMAND_COMPLETION_ITEM_SELECTED, INFO_COMPLETION_ITEM_SELECTED } from "./constants";
import { IMavenCompletionItemProvider } from "./IArtifactProvider";
import { getSortText } from "./versionUtils";

class LocalProvider implements IMavenCompletionItemProvider {
    public localRepository: string = path.join(os.homedir(), ".m2", "repository");

    public async getGroupIdCandidates(groupIdHint: string): Promise<vscode.CompletionItem[]> {
        const packageSegments: string[] = groupIdHint.split(".");
        packageSegments.pop();
        const validGroupIds: string[] = await this.searchForGroupIds(packageSegments) || [];
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "groupId", source: "maven-local" }]
        };
        return validGroupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.detail = "local";
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getArtifactIdCandidates(groupId: string): Promise<vscode.CompletionItem[]> {
        if (!groupId) {
            return [];
        }

        const validArtifactIds: string[] = await this.searchForArtifactIds(groupId);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "artifactId", source: "maven-local" }]
        };
        return validArtifactIds.map(aid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(aid, vscode.CompletionItemKind.Field);
            item.insertText = aid;
            item.detail = "local";
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getVersionCandidates(groupId: string, artifactId: string): Promise<vscode.CompletionItem[]> {
        if (!groupId || !artifactId) {
            return [];
        }

        const validVersions: string[] = await this.searchForVersions(groupId, artifactId);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "version", source: "maven-local" }]
        };
        return validVersions.map(v => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(v, vscode.CompletionItemKind.Constant);
            item.insertText = v;
            item.detail = "local";
            item.sortText = getSortText(v);
            item.command = commandOnSelection;
            return item;
        });
    }

    private async searchForGroupIds(segments: string[]): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...segments);
        return new Promise<string[]>((resolve, reject) => {
            fg.async(["**/*/*", "!**/*.*"], { onlyFiles: false, deep: 2, cwd }).then(entries => {
                const validSegments: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                const prefix: string = _.isEmpty(segments) ? "" : [...segments, ""].join(".");
                const groupIds: string[] = Array.from(new Set(validSegments)).map(seg => `${prefix}${seg}`);
                resolve(groupIds);
            }).catch(reject);
        });
    }

    private async searchForArtifactIds(groupId: string): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...groupId.split("."));
        return await new Promise<string[]>((resolve, reject) => {
            fg.async(["**/*.pom"], { deep: 2, cwd }).then(entries => {
                const validArtifactIds: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                resolve(Array.from(new Set(validArtifactIds)));
            }).catch(reject);
        });
    }

    private async searchForVersions(groupId: string, artifactId: string): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...groupId.split("."), artifactId);
        return await new Promise<string[]>((resolve, reject) => {
            fg.async(["*/*.pom"], { deep: 1, cwd }).then(entries => {
                const validVersions: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                resolve(validVersions);
            }).catch(reject);
        });
    }

}

export const localProvider: IMavenCompletionItemProvider = new LocalProvider();
