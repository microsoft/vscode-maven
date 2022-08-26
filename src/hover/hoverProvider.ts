// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import * as vscode from "vscode";
import { getXsdElement } from "../mavenXsd";

import { MavenProject } from "../explorer/model/MavenProject";
import { MavenProjectManager } from "../project/MavenProjectManager";
import { getCurrentNode, getEnclosingTag, getNodePath, getTextFromNode, XmlTagName } from "../utils/lexerUtils";

class HoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        const documentText: string = document.getText();
        const cursorOffset: number = document.offsetAt(position);
        const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
        if (currentNode === undefined || currentNode.startIndex === null || currentNode.endIndex === null) {
            return undefined;
        }

        const nodePath = getNodePath(currentNode);
        const xsdElement = getXsdElement(nodePath);

        const tagNode = getEnclosingTag(currentNode);

        switch (tagNode?.tagName) {
            case XmlTagName.GroupId:
            case XmlTagName.ArtifactId:
            case XmlTagName.Version: {
                const targetNode = tagNode.parent;
                const targetRange: vscode.Range = new vscode.Range(
                    targetNode && targetNode.startIndex !== null ? document.positionAt(targetNode?.startIndex) : position,
                    targetNode && targetNode.endIndex !== null ? document.positionAt(targetNode?.endIndex) : position,
                );

                const siblingNodes: Node[] = tagNode.parent?.children ?? [];
                const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;
                const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
                const groupIdHint = getTextFromNode(groupIdNode?.firstChild);
                const artifactIdHint = getTextFromNode(artifactIdNode?.firstChild);
                if (groupIdHint && artifactIdHint) {
                    const mavenProject: MavenProject | undefined = MavenProjectManager.get(document.uri.fsPath);
                    if (!mavenProject) {
                        return undefined;
                    }
                    const effectiveVersion: string | undefined = mavenProject.getDependencyVersion(groupIdHint, artifactIdHint);
                    if (effectiveVersion) {
                        return new vscode.Hover([
                            `groupId = ${groupIdHint}`,
                            `artifactId = ${artifactIdHint}`,
                            `version = ${effectiveVersion}`
                        ].join("\n\n"), targetRange);
                    }
                }
            }
            default:
                return xsdElement ? new vscode.Hover([xsdElement.nodePath.replace(/\./g, ">"), xsdElement.markdownString], new vscode.Range(position, position)) : undefined;
        }
    }
}

export const hoverProvider: HoverProvider = new HoverProvider();
