// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import Lexx from "xml-zero-lexer";

export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    Plugins = "plugins",
    Project = "project"
}

// Definition from xml-zero-lexer
enum NodeTypes {
    XML_DECLARATION = 0, // unofficial
    // Most XML parsers ignore this but because I'm parsing it I may as well include it.
    // At least it lets you know if there were multiple declarations.
    //
    // Also inserting it here makes Object.keys(NodeTypes) array indexes line up with values!
    // E.g. Object.keys(NodeTypes)[0] === NodeTypes.XML_DECLARATION
    // (Strictly speaking map keys are unordered but in practice they are, and we don't rely on it)
    ELEMENT_NODE = 1,
    ATTRIBUTE_NODE = 2,
    TEXT_NODE = 3, // Note that these can include entities which should be resolved before display
    CDATA_SECTION_NODE = 4,
    ENTITY_REFERENCE_NODE = 5, // Not used
    //
    // After a lot of thought I've decided that entities shouldn't be resolved in the Lexer,
    //
    // Instead entities are just ignored and are stored as-is as part of the node because =
    // (1) We only support entities that resolve to characters, we don't support crufty
    //     complicated entities that insert elements, so there's no actual structural need to
    //     do it.
    // (2) It simplifies the code and data structures, and it shrinks data structure memory usage.
    //     E.g. Text doesn't need to switch between TEXT_NODE and ENTITY_REFERENCE_NODE.
    // (3) They can be resolved later using a utility function. E.g. have a .textContent() on
    //     nodes that resolves it. This approach would probably result in less memory use.
    // (4) It's slightly against style of zero-copy because we'd need to make new strings
    //     to resolve the entities. Not a difficult job but again it's unnecessary memory use.
    //
    //  So I've decided that's not the job of this lexer.
    //
    ENTITY_NODE = 6, // Only supported as <!ENTITY ...> outside of <!DOCTYPE ...>
    // E.g. <!DOCTYPE [ <!ENTITY> ]> will just be a string inside DOCTYPE and not an ENTITY_NODE.
    PROCESSING_INSTRUCTION_NODE = 7,
    COMMENT_NODE = 8,
    DOCUMENT_NODE = 9, // Not used. Root elements are just elements.
    DOCUMENT_TYPE_NODE = 10,
    DOCUMENT_FRAGMENT_NODE = 11, // Don't support this either
    NOTATION_NODE = 12,
    CLOSE_ELEMENT = 13, // unofficial
    JSX_ATTRIBUTE = 14, // unofficial
    JSX = 15 // unofficial
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
