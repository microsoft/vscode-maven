// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { isJavaExtActivated } from "../jdtls/commands";
import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";
import { centralProvider } from "./centralProvider";
import { COMMAND_COMPLETION_ITEM_SELECTED } from "./constants";
import { indexProvider } from "./indexProvider";
import { localProvider } from "./localProvider";

const artifactSegments: string[] = [
    "\t<groupId>$1</groupId>",
    "\t<artifactId>$2</artifactId>",
    "\t<version>$3</version>"
];
const dependencySnippetString: string = [
    "<dependency>",
    ...artifactSegments,
    "</dependency>"
].join("\n");
const pluginSnippetString: string = [
    "<plugin>",
    ...artifactSegments,
    "</plugin>"
].join("\n");

class CompletionProvider implements vscode.CompletionItemProvider {

    // tslint:disable-next-line:cyclomatic-complexity
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
        const documentText: string = document.getText();
        const cursorOffset: number = document.offsetAt(position);
        const currentNode: ElementNode | undefined = getCurrentNode(documentText, cursorOffset);
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
                const indexItems: vscode.CompletionItem[] = isJavaExtActivated() ? await indexProvider.getGroupIdCandidates(groupIdHint, artifactIdHint) : [];
                const localItems: vscode.CompletionItem[] = await localProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = this.deDuplicate(centralItems, indexItems, localItems, (item) => item.insertText);
                mergedItems.forEach(item => item.range = targetRange);

                return new vscode.CompletionList(mergedItems, _.isEmpty(centralItems));
            }
            case XmlTagName.ArtifactId: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const groupIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const groupIdHint: string = groupIdNode && groupIdNode.text ? groupIdNode.text : "";
                const artifactIdHint: string = currentNode.text ? currentNode.text : "";

                const centralItems: vscode.CompletionItem[] = await centralProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = isJavaExtActivated() ? await indexProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint) : [];
                const localItems: vscode.CompletionItem[] = await localProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                let mergedItems: vscode.CompletionItem[] = [];
                const ID_SEPARATOR: string = ":";
                // tslint:disable-next-line: restrict-plus-operands
                mergedItems = this.deDuplicate(centralItems, indexItems, localItems, (item) => _.get(item, "data.groupId") + ID_SEPARATOR + item.insertText);
                mergedItems = this.reserveGidMatch(mergedItems, groupIdHint);
                if (groupIdNode && groupIdNode.contentStart !== undefined && groupIdNode.contentEnd !== undefined) {
                    for (const item of mergedItems) {
                        const matchedGroupId: string = _.get(item, "data.groupId");
                        if (matchedGroupId) {
                            const groupIdRange: vscode.Range = new vscode.Range(document.positionAt(groupIdNode.contentStart), document.positionAt(groupIdNode.contentEnd));
                            item.additionalTextEdits = [new vscode.TextEdit(groupIdRange, matchedGroupId)];
                        }
                    }
                }
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
                const indexItems: vscode.CompletionItem[] = isJavaExtActivated() ? await indexProvider.getVersionCandidates(groupIdHint, artifactIdHint) : [];
                const localItems: vscode.CompletionItem[] = await localProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = this.deDuplicate(centralItems, indexItems, localItems, (item) => item.insertText);
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, false);
            }
            case XmlTagName.Dependencies: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("dependency", vscode.CompletionItemKind.Snippet);
                const snippetContent: string = trimBrackets(dependencySnippetString, documentText, cursorOffset);
                const dependencySnippet: vscode.SnippetString = new vscode.SnippetString(snippetContent);
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
                const snippetContent: string = trimBrackets(pluginSnippetString, documentText, cursorOffset);
                const pluginSnippet: vscode.SnippetString = new vscode.SnippetString(snippetContent);
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

    private deDuplicate(first: vscode.CompletionItem[], second: vscode.CompletionItem[], third: vscode.CompletionItem[],
                        valueIteratee: (value: vscode.CompletionItem) => string|vscode.SnippetString|undefined): vscode.CompletionItem[] {
        return _.unionBy(first, second, third, valueIteratee);
    }

    private reserveGidMatch(items: vscode.CompletionItem[], groupIdHint: string): vscode.CompletionItem[] {
        const reservedItems: vscode.CompletionItem[] = items.filter(item => {
            return _.get(item, "data.groupId") === groupIdHint;
        });
        const reservedArtifactId: (string|vscode.SnippetString|undefined)[] = reservedItems.map((item) => {
            return item.insertText;
        });
        items = items.filter((item) => {
            return reservedArtifactId.indexOf(item.insertText) === -1;
        });
        items = items.concat(reservedItems);
        return items;
    }
}

function trimBrackets(snippetContent: string, fileContent: string, offset: number): string {
    let ret: string = snippetContent;
    // trim left "<" when previous chars contain "<"
    const sectionStart: number = fileContent.lastIndexOf(">", offset - 1) + 1;
    const preChars: string = fileContent.slice(sectionStart, offset).trim();
    if (preChars.startsWith("<")) {
        ret = ret.slice(1, ret.length);
    }
    // trim right ">" when next char is ">"
    const postChar: string = fileContent[offset];
    if (postChar === ">") {
        ret = ret.slice(0, ret.length - 1);
    }
    return ret;
}

export const completionProvider: CompletionProvider = new CompletionProvider();
