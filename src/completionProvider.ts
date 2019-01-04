// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import Lexx from "xml-zero-lexer";

const dependencySnippet: vscode.SnippetString = new vscode.SnippetString(["<dependency>", "\t<groupId>$1</groupId>", "\t<artifactId>$2</artifactId>", "</dependency>$0"].join("\n"));
const pluginSnippet: vscode.SnippetString = new vscode.SnippetString(["<plugin>", "\t<groupId>$1</groupId>", "\t<artifactId>$2</artifactId>", "</plugin>$0"].join("\n"));

class CompletionProvider implements vscode.CompletionItemProvider {
    public localRepository: string;
    public metadata: {
        [groupId: string]: {
            [artifactId: string]: {
                [version: string]: true
            }
        }
    };

    public async initialize(repo?: string): Promise<void> {
        if (this.metadata !== undefined) {
            return;
        }

        this.metadata = {};
        this.localRepository = repo || path.join(os.homedir(), ".m2", "repository");
        return new Promise<void>((resolve, reject) => {
            fg.stream(["**/*.pom"], { cwd: this.localRepository })
                .on("data", (chunk: string) => {
                    const segs: string[] = chunk.split("/");
                    if (segs.length > 3) {
                        const version: string = segs[segs.length - 2];
                        const artifactId: string = segs[segs.length - 3];
                        const groupId: string = segs.slice(0, segs.length - 3).join(".");
                        _.set(this.metadata, [groupId, artifactId, version], true);
                    }
                })
                .on("error", reject)
                .on("end", resolve);
        });
    }

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const range: vscode.Range = new vscode.Range(new vscode.Position(0, 0), position);
        const text: string = document.getText(range);
        const tokens: number[][] = Lexx(text);
        const currentNode: ElementNode = getElementHierarchy(text, tokens);
        if (!currentNode) {
            return null;
        }

        if (currentNode.tag === "groupId") {
            return this.completeForGroupId(document, position, currentNode);
        }
        if (currentNode.tag === "artifactId" && currentNode.parent) {
            const groupIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "groupId");
            if (!groupIdNode) {
                return null;
            }

            return this.completeForArtifactId(document, position, currentNode, groupIdNode.text);
        }
        if (currentNode.tag === "version" && currentNode.parent) {
            const groupIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "groupId");
            if (!groupIdNode) {
                return null;
            }

            const artifactIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "artifactId");
            if (!artifactIdNode) {
                return null;
            }

            return this.completeForVersion(document, position, currentNode, groupIdNode.text, artifactIdNode.text);
        }
        if (currentNode.tag === "dependencies") {
            const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("dependency", vscode.CompletionItemKind.Snippet);
            snippetItem.insertText = dependencySnippet;
            return new vscode.CompletionList([snippetItem], false);
        }
        if (currentNode.tag === "plugins") {
            const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("plugin", vscode.CompletionItemKind.Snippet);
            snippetItem.insertText = pluginSnippet;
            return new vscode.CompletionList([snippetItem], false);
        }
        return null;
    }

    private completeForGroupId(document: vscode.TextDocument, position: vscode.Position, groupIdNode: ElementNode): vscode.CompletionList {
        if (!this.metadata) {
            return null;
        }

        const validGroupIds: string[] = Object.keys(this.metadata);
        const targetRange: vscode.Range = new vscode.Range(document.positionAt(groupIdNode.offset), position);
        const groupIdItems: vscode.CompletionItem[] = validGroupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.range = targetRange;
            return item;
        });
        return new vscode.CompletionList(groupIdItems, false);
    }

    private completeForArtifactId(document: vscode.TextDocument, position: vscode.Position, artifactIdNode: ElementNode, groupId: string): vscode.CompletionList {
        if (!this.metadata || !groupId) {
            return null;
        }

        const artifactIdMap: {} = this.metadata[groupId];
        if (!artifactIdMap) {
            return null;
        }

        const validArtifactIds: string[] = Object.keys(artifactIdMap);
        const targetRange: vscode.Range = new vscode.Range(document.positionAt(artifactIdNode.offset), position);
        const artifactIdItems: vscode.CompletionItem[] = validArtifactIds.map(aid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(aid, vscode.CompletionItemKind.Field);
            item.insertText = aid;
            item.range = targetRange;
            return item;
        });
        return new vscode.CompletionList(artifactIdItems, false);
    }

    private completeForVersion(document: vscode.TextDocument, position: vscode.Position, versionNode: ElementNode, groupId: string, artifactId: string): vscode.CompletionList {
        if (!this.metadata || !groupId || !artifactId) {
            return null;
        }

        const versionMap: {} = _.get(this.metadata, [groupId, artifactId]);
        const validVersions: string[] = Object.keys(versionMap);
        const targetRange: vscode.Range = new vscode.Range(document.positionAt(versionNode.offset), position);
        const versionItems: vscode.CompletionItem[] = validVersions.map(v => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(v, vscode.CompletionItemKind.Constant);
            item.insertText = v;
            item.range = targetRange;
            return item;
        });
        return new vscode.CompletionList(versionItems, false);
    }

}

class ElementNode {
    public parent: ElementNode;
    public tag: string;
    public text?: string;
    public offset?: number; // global offset of the text part.
    public children?: ElementNode[];

    constructor(parent: ElementNode, tag: string) {
        this.parent = parent;
        this.tag = tag;
    }

    /**
     * Add a child for current node.
     * NOTE: an ElementNode can have **either** a value or a list of children.
     * E.g.
     * ```xml
     * <dependency>
     *     <groupId>test-gid</groupId>
     *     <artifactId>test-aid</artifactId>
     * </dependency>
     * ```
     * For node `dependency`, it has two children.
     * For node `groupId`, it has value of `test-gid`.
     *
     * @param child the child element node.
     */
    public addChild(child: ElementNode): void {
        if (this.text !== undefined) {
            this.text = undefined; // value cannot exist with children.
        }
        if (this.children === undefined) {
            this.children = [];
        }
        this.children.push(child);
    }

}

function getElementHierarchy(text: string, tokens: number[][]): ElementNode {
    const n: number = tokens.length;
    let current: ElementNode = null;
    let i: number = 0;
    while (i < n) {
        const token: number[] = tokens[i];
        switch (token[0]) {
            case 1: // ELEMENT_NODE
                const newElement: ElementNode = new ElementNode(current, text.substring(token[1], token[2]));
                if (current) {
                    current.addChild(newElement);
                }
                current = newElement;
                break;
            case 3: // TEXT_NODE
                if (current) {
                    current.text = text.substring(token[1], token[2]);
                    current.offset = token[1];
                }
                break;
            case 13: // CLOSE_ELEMENT
                current = current.parent;
                break;
            default:
                break;
        }
        i += 1;
    }
    return current;
}

export const completionProvider: CompletionProvider = new CompletionProvider();
