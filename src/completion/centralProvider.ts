// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";

import { ElementNode, getCurrentNode, XmlTagName } from "./lexerUtils";
import { getArtifacts, getVersions } from "./requestUtils";
import { getSortText } from "./versionUtils";

const artifactSegments: string[] = [
    "\t<groupId>$1</groupId>",
    "\t<artifactId>$2</artifactId>",
    // tslint:disable-next-line:no-invalid-template-strings
    "\t<version>${3:(0.0.0,)}</version>"
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

class RemoteProvider implements vscode.CompletionItemProvider {
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {

        const currentNode: ElementNode = getCurrentNode(document, position);
        if (!currentNode) {
            return null;
        }

        const targetRange: vscode.Range = new vscode.Range(
            currentNode.offset ? document.positionAt(currentNode.offset) : position,
            position
        );
        switch (currentNode.tag) {
            case XmlTagName.GroupId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const query: string = _.isEmpty(artifactIdNode && artifactIdNode.text) ? currentNode.text : `${currentNode.text} ${artifactIdNode.text}`;
                const body: any = await getArtifacts(query.trim());
                const docs: any[] = _.get(body, "response.docs", []);
                const groupIds: string[] = Array.from(new Set(docs.map(doc => doc.g)).values());
                const groupIdItems: vscode.CompletionItem[] = groupIds.map(gid => {
                    const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
                    item.insertText = gid;
                    item.range = targetRange;
                    item.detail = "central";
                    return item;
                });
                return new vscode.CompletionList(groupIdItems, false);
            }
            case XmlTagName.ArtifactId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const query: string = _.isEmpty(groupIdNode && groupIdNode.text) ? currentNode.text : `${currentNode.text} ${groupIdNode.text}`;
                const body: any = await getArtifacts(query.trim());
                const docs: any[] = _.get(body, "response.docs", []);
                const artifactIdItems: vscode.CompletionItem[] = docs.map(doc => {
                    const item: vscode.CompletionItem = new vscode.CompletionItem(doc.a, vscode.CompletionItemKind.Field);
                    item.insertText = doc.a;
                    item.range = targetRange;
                    item.detail = `groupId: ${doc.g}`;
                    return item;
                });
                return new vscode.CompletionList(artifactIdItems, false);
            }
            case XmlTagName.Version: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                if (!groupIdNode && !artifactIdNode) {
                    return null;
                }

                const body: any = await getVersions(groupIdNode.text, artifactIdNode.text);
                const docs: any[] = _.get(body, "response.docs", []);
                const versionItems: vscode.CompletionItem[] = docs.map((doc) => {
                    const item: vscode.CompletionItem = new vscode.CompletionItem(doc.v, vscode.CompletionItemKind.Constant);
                    item.insertText = doc.v;
                    item.range = targetRange;
                    item.detail = `Updated: ${new Date(doc.timestamp).toLocaleDateString()}`;
                    item.sortText = getSortText(doc.v);
                    return item;
                });
                return new vscode.CompletionList(versionItems, false);
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

    public resolveCompletionItem?(item: vscode.CompletionItem, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
        return item;
    }

}

export const centralProvider: RemoteProvider = new RemoteProvider();
