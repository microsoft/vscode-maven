// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import Lexx, { NodeTypes } from "xml-zero-lexer";

export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    Plugins = "plugins",
    Project = "project"
}

export class ElementNode {
    public parent: ElementNode;
    public tag: string;
    public text?: string;
    public contentStart?: number;
    public contentEnd?: number;
    public children?: ElementNode[];

    constructor(parent: ElementNode, tag: string) {
        this.parent = parent;
        this.tag = tag;
        this.text = "";
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

export function getNodesByTag(text: string, tag: string): ElementNode[] {
    const tokens: number[][] = Lexx(text);
    return getElementHierarchy(text, tokens, tag);
}

export function getCurrentNode(text: string, offset: number): ElementNode | undefined {
    const tokens: number[][] = Lexx(text);
    return getElementHierarchy(text, tokens, offset);
}

function getElementHierarchy(text: string, tokens: number[][], targetTag: string): ElementNode[];
function getElementHierarchy(text: string, tokens: number[][], cursorOffset: number): ElementNode;
// tslint:disable-next-line:cyclomatic-complexity
function getElementHierarchy(text: string, tokens: number[][], tagOrOffset: number | string): ElementNode | ElementNode[] | undefined {
    let targetTag: string | undefined;
    let cursorOffset: number | undefined;
    if (typeof tagOrOffset === "string") {
        targetTag = tagOrOffset;
    } else if (typeof tagOrOffset === "number") {
        cursorOffset = tagOrOffset;
    }
    const n: number = tokens.length;
    const elementNodes: ElementNode[] = [];
    const tagNodes: ElementNode[] = [];
    let cursorNode: ElementNode | undefined;
    let pointer: number = 0;
    let i: number = 0;

    while (i < n) {
        const token: number[] = tokens[i];
        const currentNode: ElementNode = elementNodes[elementNodes.length - 1];
        switch (token[0]) {
            case NodeTypes.XML_DECLARATION:
            case NodeTypes.ELEMENT_NODE: {
                // [_type, start, end] = token;
                const [start, end] = token.slice(1, 3);
                const newElement: ElementNode = new ElementNode(currentNode, text.substring(start, end));
                if (currentNode !== undefined) {
                    currentNode.addChild(newElement);
                }

                pointer = end + 1; // pass ">" mark.
                elementNodes.push(newElement);
                newElement.contentStart = pointer;
                break;
            }
            case NodeTypes.ATTRIBUTE_NODE: {
                // [_type, _keyStart, _keyEnd, _valueStart, valueEnd] = token;
                const valueEnd: number = token[4];
                // Attributes not handled yet.
                pointer = valueEnd + 1; // pass ">" mark.
                currentNode.contentStart = pointer;
                break;
            }
            case NodeTypes.TEXT_NODE: {
                // [_type, start, end] = token;
                const [start, end] = token.slice(1, 3);
                if (currentNode !== undefined) {
                    currentNode.text = text.substring(start, end);
                }
                pointer = end;
                break;
            }
            case NodeTypes.CLOSE_ELEMENT: {
                currentNode.contentEnd = pointer;
                elementNodes.pop();
                break;
            }
            default:
                break;
        }
        if (targetTag !== undefined && currentNode !== undefined && targetTag === currentNode.tag && tagNodes.indexOf(currentNode) < 0) {
            tagNodes.push(currentNode);
        }
        if (cursorOffset !== undefined
            && cursorNode === undefined
            && currentNode !== undefined
            && currentNode.contentStart !== undefined && currentNode.contentStart <= cursorOffset
            && currentNode.contentEnd !== undefined && cursorOffset <= currentNode.contentEnd) {
            cursorNode = currentNode;
        }
        i += 1;
    }
    if (targetTag !== undefined) {
        return tagNodes;
    } else if (cursorOffset !== undefined) {
        return cursorNode !== undefined ? cursorNode : elementNodes[elementNodes.length - 1];
    }
    return undefined;
}
