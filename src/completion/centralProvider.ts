// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { COMMAND_COMPLETION_ITEM_SELECTED } from "./constants";
import { IMavenCompletionItemProvider } from "./IArtifactProvider";
import { getArtifacts, getVersions } from "./requestUtils";
import { getSortText } from "./versionUtils";

class CentralProvider implements IMavenCompletionItemProvider {
    public async getGroupIdCandidates(groupIdHint: string, artifactIdHint: string): Promise<vscode.CompletionItem[]> {
        const keywords: string[] = [...groupIdHint.split("."), ...artifactIdHint.split("-")];
        const body: any = await getArtifacts(keywords);
        const docs: any[] = _.get(body, "response.docs", []);
        const groupIds: string[] = Array.from(new Set(docs.map(doc => doc.g)).values());
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ completeFor: "groupId", source: "maven-central" }]
        };
        return groupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.detail = "central";
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getArtifactIdCandidates(groupIdHint: string, artifactIdHint: string): Promise<vscode.CompletionItem[]> {
        const keywords: string[] = [...groupIdHint.split("."), ...artifactIdHint.split("-")];
        const body: any = await getArtifacts(keywords);
        const docs: any[] = _.get(body, "response.docs", []);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ completeFor: "artifactId", source: "maven-central" }]
        };
        return docs.map(doc => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(doc.a, vscode.CompletionItemKind.Field);
            item.insertText = doc.a;
            item.detail = `GroupId: ${doc.g}`;
            (<any>item).data = { groupId: doc.g };
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getVersionCandidates(groupId: string, artifactId: string): Promise<vscode.CompletionItem[]> {
        if (!groupId && !artifactId) {
            return [];
        }

        const body: any = await getVersions(groupId, artifactId);
        const docs: any[] = _.get(body, "response.docs", []);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ completeFor: "version", source: "maven-central" }]
        };
        return docs.map((doc) => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(doc.v, vscode.CompletionItemKind.Constant);
            item.insertText = doc.v;
            item.detail = `Updated: ${new Date(doc.timestamp).toLocaleDateString()}`;
            item.sortText = getSortText(doc.v);
            item.command = commandOnSelection;
            return item;
        });
    }
}

export const centralProvider: IMavenCompletionItemProvider = new CentralProvider();
