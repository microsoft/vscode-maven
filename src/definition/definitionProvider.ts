// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import { existsSync } from "fs";
import * as vscode from "vscode";
import { MavenProject } from "../explorer/model/MavenProject";
import { MavenProjectManager } from "../project/MavenProjectManager";
import { localPomPath, possibleLocalPomPath } from "../utils/contextUtils";
import { getCurrentNode, getEnclosingTag, getTextFromNode, XmlTagName } from "../utils/lexerUtils";

class DefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]> {
    const documentText: string = document.getText();
    const cursorOffset: number = document.offsetAt(position);
    const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
    if (currentNode === undefined || currentNode.startIndex === null || currentNode.endIndex === null) {
      return undefined;
    }

    const tagNode = getEnclosingTag(currentNode);

    switch (tagNode?.tagName) {
      case XmlTagName.GroupId:
      case XmlTagName.ArtifactId:
      case XmlTagName.Version: {
        const parentNode = tagNode.parent;
        if (!parentNode || !isTag(parentNode)) {
          return undefined;
        }
        if (parentNode.name === XmlTagName.Dependency || parentNode.name === XmlTagName.Plugin) { // plugin/dependency -> artifacts
          return getDependencyDefinitionLink(parentNode, document, position);
        } else if (parentNode.name === XmlTagName.Parent) { // parent -> artifact
          return getParentDefinitionLink(parentNode, document, position);
        } else {
          return undefined;
        }
      }
      case XmlTagName.Module: {
        return getModuleDefinitionLink(tagNode, document, position);
      }
      case XmlTagName.Parent: {
        return getParentDefinitionLink(tagNode, document, position);
      }
      case XmlTagName.Dependency:
      case XmlTagName.Plugin: {
        return getDependencyDefinitionLink(tagNode, document, position);
      }
      default:
        return undefined;
    }
  }
}

export const definitionProvider: DefinitionProvider = new DefinitionProvider();

function getParentDefinitionLink(parentNode: Element, document: vscode.TextDocument, position: vscode.Position) {
  const mavenProject: MavenProject | undefined = MavenProjectManager.get(document.uri.fsPath);
  if (mavenProject) {
    const parentPomPath = mavenProject.parentPomPath;
    if (!existsSync(parentPomPath)) {
      return undefined;
    }
    const originSelectionRange: vscode.Range = new vscode.Range(
      parentNode && parentNode.startIndex !== null ? document.positionAt(parentNode.startIndex) : position,
      parentNode && parentNode.endIndex !== null ? document.positionAt(parentNode.endIndex) : position,
    );
    const definitionLink: vscode.LocationLink = {
      targetRange: new vscode.Range(0, 0, 0, 0),
      targetUri: vscode.Uri.file(parentPomPath),
      originSelectionRange: originSelectionRange
    };
    return [definitionLink];
  }
  return undefined;
}

function getDependencyDefinitionLink(dependencyOrPluginNode: Element, document: vscode.TextDocument, position: vscode.Position) {
  const selectionRange: vscode.Range = new vscode.Range(
    dependencyOrPluginNode.startIndex !== null ? document.positionAt(dependencyOrPluginNode.startIndex) : position,
    dependencyOrPluginNode.endIndex !== null ? document.positionAt(dependencyOrPluginNode.endIndex) : position,
  );

  const siblingNodes: Node[] = dependencyOrPluginNode.children ?? [];
  const artifactIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.ArtifactId) as Element | undefined;
  const groupIdNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.GroupId) as Element | undefined;
  const versionNode: Element | undefined = siblingNodes.find(elem => isTag(elem) && elem.tagName === XmlTagName.Version) as Element | undefined;

  const groupIdHint = getTextFromNode(groupIdNode?.firstChild);
  const artifactIdHint = getTextFromNode(artifactIdNode?.firstChild);
  const versionHint = getTextFromNode(versionNode?.firstChild);
  if (groupIdHint && artifactIdHint) {
    const mavenProject: MavenProject | undefined = MavenProjectManager.get(document.uri.fsPath);
    const version: string | undefined = mavenProject?.getDependencyVersion(groupIdHint, artifactIdHint) || versionHint;
    if (version !== undefined) {
      const pomPath: string = localPomPath(groupIdHint, artifactIdHint, version);
      if (existsSync(pomPath)) {
        const definitionLink: vscode.LocationLink = {
          targetRange: new vscode.Range(0, 0, 0, 0),
          targetUri: vscode.Uri.file(pomPath).with({ scheme: "vscode-maven", authority: "local-repository" }),
          originSelectionRange: selectionRange
        };
        return [definitionLink];
      } else {
        // provide all local version under gid:aid
        const links: vscode.DefinitionLink[] = [];
        const pomPaths = possibleLocalPomPath(groupIdHint, artifactIdHint);
        for (const p of pomPaths) {
          if (existsSync(p)) {
            links.push({
              targetRange: new vscode.Range(0, 0, 0, 0),
              targetUri: vscode.Uri.file(p).with({ scheme: "vscode-maven", authority: "local-repository" }),
              originSelectionRange: selectionRange
            });
          }
        }
        return links;
      }
    }
  }
  return undefined;
}

function getModuleDefinitionLink(moduleNode: Element, document: vscode.TextDocument, position: vscode.Position) {
  const moduleName = getTextFromNode(moduleNode.firstChild);
  const targetUri = vscode.Uri.joinPath(document.uri, "..", moduleName, "pom.xml");
  const selectionRange: vscode.Range = new vscode.Range(
    moduleNode && moduleNode.startIndex !== null ? document.positionAt(moduleNode.startIndex) : position,
    moduleNode && moduleNode.endIndex !== null ? document.positionAt(moduleNode.endIndex) : position,
  );
  const definitionLink: vscode.LocationLink = {
    targetRange: new vscode.Range(0, 0, 0, 0),
    targetUri,
    originSelectionRange: selectionRange
  };
  return [definitionLink];
}