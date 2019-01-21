// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";

import { ElementNode, getCurrentNode, XmlTagName } from "./lexerUtils";
import { getArtifacts } from "./requestUtils";

const artifactSegements: string[] = [
    "\t<groupId>$1</groupId>",
    "\t<artifactId>$2</artifactId>",
    "\t<version>$3</version>"
];
const dependencySnippet: vscode.SnippetString = new vscode.SnippetString([
    "<dependency>",
    ...artifactSegements,
    "</dependency>$0"
].join("\n"));
const pluginSnippet: vscode.SnippetString = new vscode.SnippetString([
    "<plugin>",
    ...artifactSegements,
    "</plugin>$0"
].join("\n"));

class RemoteProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {

        const currentNode: ElementNode = getCurrentNode(document, position);
        if (!currentNode) {
            return null;
        }

        const targetRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.offset), position);
        switch (currentNode.tag) {
            case XmlTagName.GroupId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const query: string = _.isEmpty(artifactIdNode && artifactIdNode.text) ? currentNode.text : `${currentNode.text} ${artifactIdNode.text}`;
                const body: any = await getArtifacts(query);
                const docs: any[] = _.get(body, "response.docs", []);
                const groupIds: string[] = Array.from(new Set(docs.map(doc => doc.g)).values());
                const groupIdItems: vscode.CompletionItem[] = groupIds.map(gid => {
                    const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
                    item.insertText = gid;
                    item.range = targetRange;
                    return item;
                });
                return new vscode.CompletionList(groupIdItems, false);
            }
            case XmlTagName.ArtifactId: {
                // const body: any = await getArtifacts(currentNode.text);
                // const docs: any[] = _.get(body, "response.docs", []);

                return null;
            }

            case XmlTagName.Version:

                return null;
            case XmlTagName.Dependencies: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("dependency", vscode.CompletionItemKind.Snippet);
                snippetItem.insertText = dependencySnippet;
                snippetItem.detail = "Provided by central provider";
                return new vscode.CompletionList([snippetItem], false);
            }
            case XmlTagName.Plugins: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("plugin", vscode.CompletionItemKind.Snippet);
                snippetItem.insertText = pluginSnippet;
                snippetItem.detail = "Provided by central provider";
                return new vscode.CompletionList([snippetItem], false);
            }
            default:
                return null;
        }
    }

    public resolveCompletionItem?(item: vscode.CompletionItem, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }

}

export const centralProvider: RemoteProvider = new RemoteProvider();
