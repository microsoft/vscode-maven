// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { IArtifactSearchResult, ISearchArtifactParam, SearchType } from "../../../jdtls/artifactSearcher";
import { executeJavaLanguageServerCommand, isJavaLangugageServerStarndard } from "../../../jdtls/commands";
import { COMMAND_COMPLETION_ITEM_SELECTED, INFO_COMPLETION_ITEM_SELECTED } from "../../constants";
import { IArtifactCompletionProvider } from "./IArtifactProvider";
import { getSortText } from "../../utils";

export class FromIndex implements IArtifactCompletionProvider {
    public async getGroupIdCandidates(groupIdHint: string, artifactIdHint: string): Promise<vscode.CompletionItem[]> {
        if (!isJavaLangugageServerStarndard()) {
            return [];
        }
        const searchParam: ISearchArtifactParam = {
            searchType: SearchType.identifier,
            groupId: groupIdHint,
            artifactId: artifactIdHint
        };
        const docs = await executeJavaLanguageServerCommand<IArtifactSearchResult[]>("java.maven.searchArtifact", searchParam);
        const groupIds: string[] = Array.from(new Set(docs.map(doc => doc.groupId)).values());
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "groupId", source: "maven-index" }]
        };
        return groupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.detail = "index";
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getArtifactIdCandidates(groupIdHint: string, artifactIdHint: string): Promise<vscode.CompletionItem[]> {
        if (!isJavaLangugageServerStarndard()) {
            return [];
        }
        const searchParam: ISearchArtifactParam = {
            searchType: SearchType.identifier,
            groupId: groupIdHint,
            artifactId: artifactIdHint
        };
        const docs: IArtifactSearchResult[] = await executeJavaLanguageServerCommand("java.maven.searchArtifact", searchParam);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "artifactId", source: "maven-index" }]
        };
        return docs.map(doc => {
            const item: vscode.CompletionItem = new vscode.CompletionItem({
                label: doc.artifactId,
                detail: "detail",
                description: doc.groupId

            }, vscode.CompletionItemKind.Field);
            item.insertText = doc.artifactId;
            item.detail = `GroupId: ${doc.groupId}`;
            (item as any).data = { groupId: doc.groupId };
            item.command = commandOnSelection;
            return item;
        });
    }

    public async getVersionCandidates(groupId: string, artifactId: string): Promise<vscode.CompletionItem[]> {
        if (!groupId && !artifactId) {
            return [];
        }
        if (!isJavaLangugageServerStarndard()) {
            return [];
        }
        const searchParam: ISearchArtifactParam = {
            searchType: SearchType.identifier,
            groupId,
            artifactId
        };
        const docs: IArtifactSearchResult[] = await executeJavaLanguageServerCommand("java.maven.searchArtifact", searchParam);
        const commandOnSelection: vscode.Command = {
            title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
            arguments: [{ infoName: INFO_COMPLETION_ITEM_SELECTED, completeFor: "version", source: "maven-index" }]
        };
        return docs.map((doc) => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(doc.version, vscode.CompletionItemKind.Constant);
            item.insertText = doc.version;
            item.sortText = getSortText(doc.version);
            item.command = commandOnSelection;
            return item;
        });
    }
}
