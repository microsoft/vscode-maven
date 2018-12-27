// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import Lexx from "xml-zero-lexer";

class CompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
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
        // To implement
        return new vscode.CompletionList([new vscode.CompletionItem("placeholder")]);
    }

    private completeForArtifactId(groupId: string): vscode.CompletionList {
        // To implement
        return new vscode.CompletionList([new vscode.CompletionItem(`placeholder for ${groupId}`)]);
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
     *      <artifactId>test-aid</artifactId>
     * </dependency>
     * ```
     * For node `dependeny`, it has two children.
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
