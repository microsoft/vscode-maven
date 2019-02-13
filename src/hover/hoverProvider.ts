// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";

import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";
import { getLatestVersion } from "../utils/requestUtils";

class HoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover> {
        const currentNode: ElementNode = getCurrentNode(document, position);
        if (!currentNode) {
            return undefined;
        }
        const targetRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.contentStart), document.positionAt(currentNode.contentEnd));
        switch (currentNode.tag) {
            case XmlTagName.GroupId:
            case XmlTagName.ArtifactId:
            case XmlTagName.Version: {
                const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
                const artifactIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
                const groupIdNode: ElementNode = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
                const groupIdHint: string = groupIdNode && groupIdNode.text;
                const artifactIdHint: string = artifactIdNode && artifactIdNode.text;
                if (groupIdHint && artifactIdHint) {
                    const latestVersion: string = await getLatestVersion(groupIdHint, artifactIdHint);
                    const id: string = `${groupIdHint}:${artifactIdHint}`;
                    return new vscode.Hover(`id = ${id}, latestVersion = ${latestVersion}`, targetRange);
                }

            }
            default:
                return undefined;
        }
    }

}

export const hoverProvider: HoverProvider = new HoverProvider();
