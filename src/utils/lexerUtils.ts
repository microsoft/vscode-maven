// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Document, isTag, Node, NodeWithChildren, Element, isText } from "domhandler";
import * as hp from "htmlparser2";

export type ElementNode = Node;
export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    DependencyManagement = "dependencyManagement",
    Exclusions = "exclusions",
    Plugins = "plugins",
    Project = "project",
    Dependency = "dependency"
}

export function getNodesByTag(text: string, tag: string): Element[] {
    const document: Document = hp.parseDocument(text, {
        withEndIndices: true,
        withStartIndices: true,
        lowerCaseTags: false,
        xmlMode: true,
    });
    const ret: Element[] = [];
    dfs(document, (node) => isTag(node) && node.tagName === tag, ret);
    return ret;
}

export function getCurrentNode(text: string, offset: number): Node | undefined {
    const document: Document = hp.parseDocument(text, {
        withEndIndices: true,
        withStartIndices: true,
        lowerCaseTags: false,
        xmlMode: true,
    });
    const ret: Node[] = [];
    dfs(document, (node) => node.startIndex !== null && node.startIndex <= offset && node.endIndex !== null && offset <= node.endIndex, ret, true);
    return ret?.[ret.length - 1];
}

export function getTextFromNode(node: Node | undefined | null, fallbackValue: string = "") {
    return node && isText(node) ? node.data : fallbackValue;
}

export function getInnerStartIndex(node: Element) {
    return node.startIndex! + node.tagName.length + "<>".length;
}

export function getInnerEndIndex(node: Element) {
    return node.endIndex! - node.tagName.length - "</>".length + 1;
}
function dfs(node: Node, pred: (arg: Node) => boolean, result: Node[], includeAll?: boolean) {
    if (pred(node)) {
        result.push(node);
        if (!includeAll) {
            return;
        }
    }
    if (node instanceof NodeWithChildren) {
        for (const child of (node as NodeWithChildren).children) {
            dfs(child, pred, result, includeAll);
        }
    }
}
