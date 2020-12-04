// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";

import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";

class HoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover | undefined> {
        const currentNode: ElementNode | undefined = getCurrentNode(document.getText(), document.offsetAt(position));
        if (currentNode === undefined || currentNode.contentStart === undefined || currentNode.contentEnd === undefined) {
            return undefined;
        }
        const targetRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.contentStart), document.positionAt(currentNode.contentEnd));
        switch (currentNode.tag) {
            case XmlTagName.GroupId:
            case XmlTagName.ArtifactId:
            case XmlTagName.Version: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const groupIdHint: string | undefined = groupIdNode && groupIdNode.text;
                const artifactIdHint: string | undefined = artifactIdNode && artifactIdNode.text;
                if (groupIdHint && artifactIdHint) {
                    const mavenProject: MavenProject | undefined = mavenExplorerProvider.getMavenProject(document.uri.fsPath);
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
                return undefined;
        }
    }
}

export const hoverProvider: HoverProvider = new HoverProvider();
