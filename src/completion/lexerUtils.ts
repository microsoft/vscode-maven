// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import Lexx from "xml-zero-lexer";

export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    Plugins = "Plugins"
}

export class ElementNode {
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

export function getCurrentNode(document: vscode.TextDocument, position: vscode.Position): ElementNode {
    const range: vscode.Range = new vscode.Range(new vscode.Position(0, 0), position);
    const text: string = document.getText(range);
    const tokens: number[][] = Lexx(text);
    return getElementHierarchy(text, tokens);
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
