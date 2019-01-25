// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { centralProvider } from "./centralProvider";
import { ElementNode, getCurrentNode, XmlTagName } from "./lexerUtils";
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

    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {

        const currentNode: ElementNode = getCurrentNode(document, position);
        if (!currentNode) {
            return null;
        }

        const targetRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.contentStart), position);
        switch (currentNode.tag) {
            case XmlTagName.GroupId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdHint: string = currentNode.text || "";
                const artifactIdHint: string = artifactIdNode && artifactIdNode.text || "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = this.deDuplicate(centralItems, localItems);
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, false);
            }
            case XmlTagName.ArtifactId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const groupIdHint: string = groupIdNode && groupIdNode.text || "";
                const artifactIdHint: string = currentNode.text || "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                if (groupIdNode) {
                    centralItems.forEach(item => {
                        const matchedGroupId: string = _.get(item, "data.groupId");
                        if (matchedGroupId) {
                            const groupIdRange: vscode.Range = new vscode.Range(document.positionAt(groupIdNode.contentStart), document.positionAt(groupIdNode.contentEnd));
                            item.additionalTextEdits = [new vscode.TextEdit(groupIdRange, matchedGroupId)];
                        }
                    });
                }
                const localItems: vscode.CompletionItem[] = await localProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = [].concat(centralItems, localItems);
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, false);
            }
            case XmlTagName.Version: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdHint: string = groupIdNode && groupIdNode.text || "";
                const artifactIdHint: string = artifactIdNode && artifactIdNode.text || "";

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
                return new vscode.CompletionList([snippetItem], false);
            }
            case XmlTagName.Plugins: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("plugin", vscode.CompletionItemKind.Snippet);
                snippetItem.insertText = pluginSnippet;
                snippetItem.detail = "Maven Snippet";
                return new vscode.CompletionList([snippetItem], false);
            }
            default:
                return null;
        }
    }

    private deDuplicate(primary: vscode.CompletionItem[], secondary: vscode.CompletionItem[]): vscode.CompletionItem[] {
        return _.unionBy(primary, secondary, (item) => item.insertText);
    }
}

export const completionProvider: CompletionProvider = new CompletionProvider();
