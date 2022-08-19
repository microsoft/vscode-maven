// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { getMavenLocalRepository } from "../../../utils/contextUtils";
import { COMMAND_COMPLETION_ITEM_SELECTED, INFO_COMPLETION_ITEM_SELECTED } from "../../constants";
import { IArtifactCompletionProvider } from "./IArtifactProvider";
import { getSortText } from "../../utils";

export class FromLocal implements IArtifactCompletionProvider {

    public async getGroupIdCandidates(groupIdHint: string): Promise<vscode.CompletionItem[]> {
        const packageSegments: string[] = groupIdHint.split(".");
        packageSegments.pop();
        const validGroupIds: string[] = await this.searchForGroupIds(packageSegments);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "groupId", source: "maven-local" }]
        };
        return validGroupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.detail = "From Local Repository";
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
            const item: vscode.CompletionItem = new vscode.CompletionItem({
                label: aid,
                description: groupId
            }, vscode.CompletionItemKind.Field);
            item.insertText = aid;
            item.detail = `GroupId: ${groupId}`;
            (item as any).data = { groupId };
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
            item.detail = "From Local Repository";
            item.sortText = getSortText(v);
            item.command = commandOnSelection;
            return item;
        });
    }

    private async searchForGroupIds(segments: string[]): Promise<string[]> {
        const cwd: string = path.join(getMavenLocalRepository(), ...segments);
        try {
            const entries = await fg(["**/*/*", "!**/*.*"], { onlyFiles: false, deep: 3, cwd });
            const validSegments: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
            const prefix: string = _.isEmpty(segments) ? "" : [...segments, ""].join(".");
            return Array.from(new Set(validSegments)).map(seg => `${prefix}${seg}`);
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    private async searchForArtifactIds(groupId: string): Promise<string[]> {
        const cwd: string = path.join(getMavenLocalRepository(), ...groupId.split("."));
        try {

            const entries = await fg(["**/*.pom"], { deep: 3, cwd });
            const validArtifactIds: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
            return Array.from(new Set(validArtifactIds));
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    private async searchForVersions(groupId: string, artifactId: string): Promise<string[]> {
        const cwd: string = path.join(getMavenLocalRepository(), ...groupId.split("."), artifactId);
        try {
            const entries = await fg(["*/*.pom"], { deep: 2, cwd });
            return entries.map((e: string) => e.substring(0, e.indexOf("/")));
        } catch (error) {
            console.error(error);
            return [];
        }
    }

}
