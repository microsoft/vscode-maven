// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";

import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";

class HoverProvider implements vscode.HoverProvider {
    public async provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): Promise<vscode.Hover> {
        const currentNode: ElementNode = getCurrentNode(document.getText(), document.offsetAt(position));
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
                    const effectiveVersion: string = getEffectiveVersion(document.uri, groupIdHint, artifactIdHint);
                    if (effectiveVersion) {
                        return new vscode.Hover([
                            `gourpId = ${groupIdHint}`,
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

function getEffectiveVersion(uri: vscode.Uri, gid: string, aid: string): string {
    const mavenProject: MavenProject = mavenExplorerProvider.getMavenProject(uri.fsPath);
    if (!mavenProject) {
        return undefined;
    }

    const deps: {}[] = _.get(mavenProject.effectivePom.data, "project.dependencies[0].dependency", []);
    const targetDep: {} = deps.find(elem => _.get(elem, "groupId[0]") === gid && _.get(elem, "artifactId[0]") === aid);
    return targetDep && _.get(targetDep, "version[0]");

}

export const hoverProvider: HoverProvider = new HoverProvider();
