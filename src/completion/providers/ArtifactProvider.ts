// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import * as _ from "lodash";
import * as vscode from "vscode";
import { getTextFromNode, XmlTagName } from "../../utils/lexerUtils";
import { FromCentral } from "./artifact/FromCentral";
import { FromIndex } from "./artifact/FromIndex";
import { FromLocal } from "./artifact/FromLocal";
import { IXmlCompletionProvider } from "./IXmlCompletionProvider";

const DEFAULT_GROUP_ID: string = "org.apache.maven.plugins";

export class ArtifactProvider implements IXmlCompletionProvider {
    private centralProvider;
    private indexProvider;
    private localProvider;
    constructor() {
        this.centralProvider = new FromCentral();
        this.indexProvider = new FromIndex();
        this.localProvider = new FromLocal();
    }

    async provide(document: vscode.TextDocument, position: vscode.Position, currentNode: Node): Promise<vscode.CompletionItem[]> {
        let tagNode: Element | undefined;
        if (isTag(currentNode)) {
            tagNode = currentNode;
        } else if (currentNode.parent && isTag(currentNode.parent)) {
            tagNode = currentNode.parent;
        } else {
            // TODO: should we recursively traverse up to find nearest tag node?
            return [];
        }

        switch (tagNode.tagName) {
            case XmlTagName.GroupId: {
                const groupIdTextNode = tagNode.firstChild;
                const targetRange: vscode.Range = getRange(groupIdTextNode, document, position)!;

                const siblingNodes: Node[] = tagNode.parent?.children ?? [];
                const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;
                const artifactIdTextNode = artifactIdNode?.firstChild;

                const groupIdHint: string = getTextFromNode(groupIdTextNode);
                const artifactIdHint: string = getTextFromNode(artifactIdTextNode);

                const centralItems: vscode.CompletionItem[] = await this.centralProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await this.indexProvider.getGroupIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await this.localProvider.getGroupIdCandidates(groupIdHint);
                const mergedItems: vscode.CompletionItem[] = _.unionBy(centralItems, indexItems, localItems, (item) => item.insertText);
                mergedItems.forEach(item => item.range = targetRange);
                return mergedItems;
            }
            case XmlTagName.ArtifactId: {
                const artifactIdTextNode = tagNode.firstChild;
                const targetRange: vscode.Range = getRange(artifactIdTextNode, document, position)!;

                const siblingNodes: Node[] = tagNode.parent?.children ?? [];
                const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
                const groupIdTextNode = groupIdNode?.firstChild;

                const groupIdHint: string = getTextFromNode(groupIdTextNode);
                const artifactIdHint: string = getTextFromNode(artifactIdTextNode);

                const centralItems: vscode.CompletionItem[] = await this.centralProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await this.indexProvider.getArtifactIdCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await this.localProvider.getArtifactIdCandidates(groupIdHint);
                let mergedItems: vscode.CompletionItem[] = [];

                const ID_SEPARATOR: string = ":";
                mergedItems = _.unionBy(centralItems, indexItems, localItems, (item) => _.get(item, "data.groupId") + ID_SEPARATOR + item.insertText);
                mergedItems = dedupItemsWithGroupId(mergedItems, groupIdHint);

                // also update corresponding groupId node
                if (groupIdTextNode && groupIdTextNode.startIndex !== null && groupIdTextNode.endIndex !== null) {
                    for (const item of mergedItems) {
                        const matchedGroupId: string | undefined = _.get(item, "data.groupId");
                        if (matchedGroupId) {
                            const groupIdRange: vscode.Range | undefined = getRange(groupIdTextNode, document);
                            if (groupIdRange){
                                item.additionalTextEdits = [new vscode.TextEdit(groupIdRange, matchedGroupId)];
                            }
                        }
                    }
                }
                mergedItems.forEach(item => item.range = targetRange);
                return mergedItems;
            }
            case XmlTagName.Version: {
                const versionTextNode = tagNode.firstChild;
                const targetRange: vscode.Range = getRange(versionTextNode, document, position)!;

                const siblingNodes: Node[] = tagNode.parent?.children ?? [];
                const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
                const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;

                const groupIdHint: string = getTextFromNode(groupIdNode?.firstChild, DEFAULT_GROUP_ID);
                const artifactIdHint: string = getTextFromNode(artifactIdNode?.firstChild);
                if (!groupIdHint || !artifactIdHint) {
                    return [];
                }

                const centralItems: vscode.CompletionItem[] = await this.centralProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const indexItems: vscode.CompletionItem[] = await this.indexProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const localItems: vscode.CompletionItem[] = await this.localProvider.getVersionCandidates(groupIdHint, artifactIdHint);
                const mergedItems: vscode.CompletionItem[] = _.unionBy(centralItems, indexItems, localItems, (item) => item.insertText);
                mergedItems.forEach(item => item.range = targetRange);
                return mergedItems;
            }
        }
        return [];
    }
}

function getRange(node: Node | null, document: vscode.TextDocument, fallbackPosition?: vscode.Position) {
    if (fallbackPosition) {
        return new vscode.Range(
            node?.startIndex ? document.positionAt(node.startIndex) : fallbackPosition,
            node?.endIndex ? document.positionAt(node.endIndex + 1) : fallbackPosition
        );
    } else if (node !== null && node.startIndex !== null && node.endIndex !== null) {
        return new vscode.Range(
            document.positionAt(node.startIndex),
            document.positionAt(node.endIndex + 1)
        );
    } else {
        return undefined;
    }
}

function dedupItemsWithGroupId(items: vscode.CompletionItem[], groupId: string): vscode.CompletionItem[] {
    const itemsWithGivenGroupId: vscode.CompletionItem[] = items.filter(item => _.get(item, "data.groupId") === groupId);
    const reservedArtifactIds: (string|vscode.SnippetString|undefined)[] = itemsWithGivenGroupId.map(item => item.insertText);
    const dedupedItems = items.filter((item) => !reservedArtifactIds.includes(item.insertText));
    return itemsWithGivenGroupId.concat(dedupedItems);
}
