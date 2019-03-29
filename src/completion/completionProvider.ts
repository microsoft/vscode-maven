// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";
import { centralProvider } from "./centralProvider";
import { COMMAND_COMPLETION_ITEM_SELECTED } from "./constants";
import { localProvider } from "./localProvider";

const artifactSegments: string[] = [
    "\t<groupId>$1</groupId>",
    "\t<artifactId>$2</artifactId>",
    "\t<version>$3</version>"
];
const dependencySnippet: vscode.SnippetString = new vscode.SnippetString([
    "<dependency>",
    ...artifactSegments,
    "</dependency>$0"
].join("\n"));
const pluginSnippet: vscode.SnippetString = new vscode.SnippetString([
    "<plugin>",
    ...artifactSegments,
    "</plugin>$0"
].join("\n"));

class CompletionProvider implements vscode.CompletionItemProvider {
    public localRepository: string = path.join(os.homedir(), ".m2", "repository");

// tslint:disable-next-line: cyclomatic-complexity
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {

        const currentNode: ElementNode | undefined = getCurrentNode(document.getText(), document.offsetAt(position));
        if (currentNode === undefined || currentNode.contentStart === undefined) {
            return undefined;
        }

        const targetRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.contentStart), position);
        switch (currentNode.tag) {
            case XmlTagName.GroupId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdHint: string = currentNode.text ? currentNode.text : "";
                const artifactIdHint: string = artifactIdNode && artifactIdNode.text ? artifactIdNode.text : "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = this.deDuplicate(centralItems, localItems);
                mergedItems.forEach(item => item.range = targetRange);

                return new vscode.CompletionList(mergedItems, _.isEmpty(centralItems));
            }
            case XmlTagName.ArtifactId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const groupIdHint: string = groupIdNode && groupIdNode.text ? groupIdNode.text : "";
                const artifactIdHint: string = currentNode.text ? currentNode.text : "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                if (groupIdNode && groupIdNode.contentStart !== undefined && groupIdNode.contentEnd !== undefined) {
                    for (const item of centralItems) {
                        const matchedGroupId: string = _.get(item, "data.groupId");
                        if (matchedGroupId) {
                            const groupIdRange: vscode.Range = new vscode.Range(document.positionAt(groupIdNode.contentStart), document.positionAt(groupIdNode.contentEnd));
                            item.additionalTextEdits = [new vscode.TextEdit(groupIdRange, matchedGroupId)];
                        }
                    }
                }
                const localItems: vscode.CompletionItem[] = await localProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = [];
                mergedItems.push(...centralItems, ...localItems);
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, _.isEmpty(centralItems));
            }
            case XmlTagName.Version: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const artifactIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdHint: string = groupIdNode && groupIdNode.text ? groupIdNode.text : "";
                const artifactIdHint: string = artifactIdNode && artifactIdNode.text ? artifactIdNode.text : "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = this.deDuplicate(centralItems, localItems);
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, false);
            }
            case XmlTagName.Dependencies: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("dependency", vscode.CompletionItemKind.Snippet);
                snippetItem.insertText = dependencySnippet;
                snippetItem.detail = "Maven Snippet";
                snippetItem.command = {
                    title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
                    arguments: [{ completeFor: "dependency", source: "snippet" }]
                };
                return new vscode.CompletionList([snippetItem], false);
            }
            case XmlTagName.Plugins: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("plugin", vscode.CompletionItemKind.Snippet);
                snippetItem.insertText = pluginSnippet;
                snippetItem.detail = "Maven Snippet";
                snippetItem.command = {
                    title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
                    arguments: [{ completeFor: "plugin", source: "snippet" }]
                };
                return new vscode.CompletionList([snippetItem], false);
            }
            default:
                return undefined;
        }
    }

    private deDuplicate(primary: vscode.CompletionItem[], secondary: vscode.CompletionItem[]): vscode.CompletionItem[] {
        return _.unionBy(primary, secondary, (item) => item.insertText);
    }
}

export const completionProvider: CompletionProvider = new CompletionProvider();
