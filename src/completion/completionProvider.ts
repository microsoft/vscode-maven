// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import * as _ from "lodash";
import * as vscode from "vscode";
import { getCurrentNode, getTextFromNode, XmlTagName } from "../utils/lexerUtils";
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

const DEFAULT_GROUP_ID: string = "org.apache.maven.plugins";

class CompletionProvider implements vscode.CompletionItemProvider {

    // tslint:disable-next-line:cyclomatic-complexity
    public async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
        const documentText: string = document.getText();
        const cursorOffset: number = document.offsetAt(position);
        const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
        if (currentNode === undefined || currentNode.startIndex === null || !isTag(currentNode)) {
            return undefined;
        }

        switch (currentNode.tagName) {
            case XmlTagName.GroupId: {
                const groupIdTextNode = currentNode.firstChild;
                const targetRange: vscode.Range = new vscode.Range(
                    groupIdTextNode?.startIndex ? document.positionAt(groupIdTextNode.startIndex) : position,
                    groupIdTextNode?.endIndex ? document.positionAt(groupIdTextNode.endIndex) : position
                );

                const siblingNodes: Node[] = currentNode.parent?.children ?? [];
                const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;
                const artifactIdTextNode = artifactIdNode?.firstChild;

                const groupIdHint: string = getTextFromNode(groupIdTextNode);
                const artifactIdHint: string = getTextFromNode(artifactIdTextNode);

                const centralItems: vscode.CompletionItem[] = await centralProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await indexProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = _.unionBy(centralItems, indexItems, localItems, (item) => item.insertText);
                mergedItems.forEach(item => item.range = targetRange);

                return new vscode.CompletionList(mergedItems, _.isEmpty(centralItems));
            }
            case XmlTagName.ArtifactId: {
                const artifactIdTextNode = currentNode.firstChild;
                const targetRange: vscode.Range = new vscode.Range(
                    artifactIdTextNode?.startIndex ? document.positionAt(artifactIdTextNode.startIndex) : position,
                    artifactIdTextNode?.endIndex ? document.positionAt(artifactIdTextNode.endIndex) : position
                );

                const siblingNodes: Node[] = currentNode.parent?.children ?? [];
                const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
                const groupIdTextNode = groupIdNode?.firstChild;

                const groupIdHint: string = getTextFromNode(groupIdTextNode);
                const artifactIdHint: string = getTextFromNode(artifactIdTextNode);

                const centralItems: vscode.CompletionItem[] = await centralProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await indexProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                let mergedItems: vscode.CompletionItem[] = [];

                const ID_SEPARATOR: string = ":";
                mergedItems = _.unionBy(centralItems, indexItems, localItems, (item) => _.get(item, "data.groupId") + ID_SEPARATOR + item.insertText);
                mergedItems = dedupItemsWithGroupId(mergedItems, groupIdHint);

                // also update corresponding groupId node
                if (groupIdTextNode && groupIdTextNode.startIndex !== null && groupIdTextNode.endIndex !== null) {
                    for (const item of mergedItems) {
                        const matchedGroupId: string = _.get(item, "data.groupId");
                        if (matchedGroupId) {
                            const groupIdRange: vscode.Range = new vscode.Range(
                                document.positionAt(groupIdTextNode.startIndex),
                                document.positionAt(groupIdTextNode.endIndex)
                            );
                            item.additionalTextEdits = [new vscode.TextEdit(groupIdRange, matchedGroupId)];
                        }
                    }
                }
                mergedItems.forEach(item => item.range = targetRange);
                return new vscode.CompletionList(mergedItems, _.isEmpty(centralItems));
            }
            case XmlTagName.Version: {
                const versionTextNode = currentNode.firstChild;
                const targetRange: vscode.Range = new vscode.Range(
                    versionTextNode?.startIndex ? document.positionAt(versionTextNode.startIndex) : position,
                    versionTextNode?.endIndex ? document.positionAt(versionTextNode.endIndex) : position
                );

                const siblingNodes: Node[] = currentNode.parent?.children ?? [];
                const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
                const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;

                const groupIdHint: string = getTextFromNode(groupIdNode?.firstChild, DEFAULT_GROUP_ID);
                const artifactIdHint: string = getTextFromNode(artifactIdNode?.firstChild);
                if (!groupIdHint || !artifactIdHint) {
                    return [];
                }

                const centralItems: vscode.CompletionItem[] = await centralProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await indexProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await localProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = _.unionBy(centralItems, indexItems, localItems, (item) => item.insertText);
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
}

function dedupItemsWithGroupId(items: vscode.CompletionItem[], groupId: string): vscode.CompletionItem[] {
    const itemsWithGivenGroupId: vscode.CompletionItem[] = items.filter(item => _.get(item, "data.groupId") === groupId);
    const reservedArtifactIds: (string|vscode.SnippetString|undefined)[] = itemsWithGivenGroupId.map(item => item.insertText);
    const dedupedItems = items.filter((item) => !reservedArtifactIds.includes(item.insertText));
    return itemsWithGivenGroupId.concat(dedupedItems);
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
