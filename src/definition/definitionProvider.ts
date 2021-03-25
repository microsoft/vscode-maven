// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { getMavenLocalRepository } from "../utils/contextUtils";
import { ElementNode, getCurrentNode, XmlTagName } from "../utils/lexerUtils";

class DefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const documentText: string = document.getText();
    const cursorOffset: number = document.offsetAt(position);
    const currentNode: ElementNode | undefined = getCurrentNode(documentText, cursorOffset);
    if (currentNode === undefined || currentNode.contentStart === undefined || currentNode.contentEnd === undefined) {
      return undefined;
    }
    const selectionRange: vscode.Range = new vscode.Range(document.positionAt(currentNode.contentStart), document.positionAt(currentNode.contentEnd));
    switch (currentNode.tag) {
      case XmlTagName.GroupId:
      case XmlTagName.ArtifactId:
      case XmlTagName.Version: {
        const siblingNodes: ElementNode[] = _.get(currentNode, "parent.children", []);
        const artifactIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.ArtifactId);
        const groupIdNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.GroupId);
        const versionNode: ElementNode | undefined = siblingNodes.find(elem => elem.tag === XmlTagName.Version);
        const groupIdHint: string | undefined = groupIdNode && groupIdNode.text;
        const artifactIdHint: string | undefined = artifactIdNode && artifactIdNode.text;
        const versionHint: string | undefined = versionNode && versionNode.text;
        if (groupIdHint && artifactIdHint) {
          const mavenProject: MavenProject | undefined = mavenExplorerProvider.getMavenProject(document.uri.fsPath);
          const version: string | undefined = mavenProject?.getDependencyVersion(groupIdHint, artifactIdHint) || versionHint;
          if (version !== undefined && version.match(/^\$\{.*\}$/) === null) { // skip for unresolved properties, e.g. ${azure.version}
            const pomPath: string = localPomPath(groupIdHint, artifactIdHint, version);
            const definitionLink: vscode.LocationLink = {
              targetRange: new vscode.Range(0, 0, 0, 0),
              targetUri: vscode.Uri.file(pomPath),
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

function localPomPath(gid: string, aid: string, version: string): string {
  return path.join(getMavenLocalRepository(), ...gid.split("."), aid, version, `${aid}-${version}.pom`);
}

export const definitionProvider: DefinitionProvider = new DefinitionProvider();
