// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import Lexx from "xml-zero-lexer";

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
        if (!this.metadata) {
            return null;
        }

        const range: vscode.Range = new vscode.Range(new vscode.Position(0, 0), position);
        const text: string = document.getText(range);
        const tokens: number[][] = Lexx(text);
        const currentNode: ElementNode = getElementHierarchy(text, tokens);
        if (currentNode.tag === "artifactId" && currentNode.parent && currentNode.parent.tag === "dependency") {
            const groupIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "groupId");
            return this.completeForArtifactId(groupIdNode.value);
        }

        if (currentNode.tag === "groupId" && currentNode.parent && currentNode.parent.tag === "dependency") {
            return this.completeForGroupId();
        }
        return null;
    }

    private completeForGroupId(): vscode.CompletionList {
        return new vscode.CompletionList(Object.keys(this.metadata).map(gid => new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module)), false);
    }

    private completeForArtifactId(groupId: string): vscode.CompletionList {
        if (!this.metadata[groupId]) {
            return null;
        }
        return new vscode.CompletionList(Object.keys(this.metadata[groupId]).map(aid => new vscode.CompletionItem(aid, vscode.CompletionItemKind.Field), false));
    }

}

class ElementNode {
    public parent: ElementNode;
    public tag: string;
    public value?: string;
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
        if (this.value !== undefined) {
            this.value = undefined; // value cannot exist with children.
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
                    current.value = text.substring(token[1], token[2]);
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
