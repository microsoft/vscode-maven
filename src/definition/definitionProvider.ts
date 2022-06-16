// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { localPomPath } from "../utils/contextUtils";
import { getCurrentNode, getTextFromNode, XmlTagName } from "../utils/lexerUtils";

class DefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const documentText: string = document.getText();
    const cursorOffset: number = document.offsetAt(position);
    const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
    if (currentNode === undefined || currentNode.startIndex === null || currentNode.endIndex === null) {
      return undefined;
    }

    let tagNode;
    if (isTag(currentNode)) {
      tagNode = currentNode;
    } else if (currentNode.parent && isTag(currentNode.parent)) {
      tagNode = currentNode.parent;
    } else {
      // TODO: should we recursively traverse up to find nearest tag node?
    }

    switch (tagNode?.tagName) {
      case XmlTagName.GroupId:
      case XmlTagName.ArtifactId:
      case XmlTagName.Version: {
        const targetNode = tagNode.parent;
        const selectionRange: vscode.Range = new vscode.Range(
          targetNode && targetNode.startIndex !== null ?document.positionAt(targetNode?.startIndex) : position,
          targetNode && targetNode.endIndex !== null ?document.positionAt(targetNode?.endIndex) : position,
        );

        const siblingNodes: Node[] = tagNode.parent?.children ?? [];
        const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;
        const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
        const versionNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.Version) as Element | undefined;

        const groupIdHint = getTextFromNode(groupIdNode?.firstChild);
        const artifactIdHint = getTextFromNode(artifactIdNode?.firstChild);
        const versionHint = getTextFromNode(versionNode?.firstChild);
        if (groupIdHint && artifactIdHint) {
          const mavenProject: MavenProject | undefined = mavenExplorerProvider.getMavenProject(document.uri.fsPath);
          const version: string | undefined = mavenProject?.getDependencyVersion(groupIdHint, artifactIdHint) || versionHint;
          if (version !== undefined && version.match(/^\$\{.*\}$/) === null) { // skip for unresolved properties, e.g. ${azure.version}
            const pomPath: string = localPomPath(groupIdHint, artifactIdHint, version);
            const definitionLink: vscode.LocationLink = {
              targetRange: new vscode.Range(0, 0, 0, 0),
              targetUri: vscode.Uri.file(pomPath).with({ scheme: "vscode-maven", authority: "local-repository" }),
              originSelectionRange: selectionRange
            };
            return [definitionLink];
          }
        }
      }
      default:
        return undefined;
    }
  }
}

export const definitionProvider: DefinitionProvider = new DefinitionProvider();
