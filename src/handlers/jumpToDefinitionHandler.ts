// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, isText } from "domhandler";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { Dependency } from "../explorer/model/Dependency";
import { MavenProject } from "../explorer/model/MavenProject";
import { localPomPath } from "../utils/contextUtils";
import { UserError } from "../utils/errorUtils";
import { getNodesByTag, XmlTagName } from "../utils/lexerUtils";

export async function jumpToDefinitionHandler(node?: Dependency): Promise<void> {
    if (node === undefined) {
        throw new Error("No dependency node specified.");
    }

    let selectedPath: string;
    if (node.parent === undefined) {
        selectedPath = node.projectPomPath;
    } else {
        const parent: Dependency = node.parent;
        selectedPath = localPomPath(parent.groupId, parent.artifactId, parent.version);
    }
    await goToDefinition(selectedPath, node.groupId, node.artifactId);
}

async function goToDefinition(pomPath: string, gid: string, aid: string): Promise<void> {
    const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);

    const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(pomPath), {preserveFocus: true});
    const projectNodes: Element[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: Element = projectNodes[0];
    const dependenciesNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.Dependencies) as Element | undefined;
    const dependencyNode = dependenciesNode?.children?.find(node =>
        isTag(node) &&
        node.tagName === XmlTagName.Dependency &&
        node.children?.find(id =>
            isTag(id) && id.tagName === XmlTagName.GroupId &&
            id.firstChild && isText(id.firstChild) &&
            (project ? project.fillProperties(id.firstChild.data) : id.firstChild.data) === gid
        ) &&
        node.children?.find(id =>
            isTag(id) && id.tagName === XmlTagName.ArtifactId &&
            id.firstChild && isText(id.firstChild) &&
            (project ? project.fillProperties(id.firstChild.data) : id.firstChild.data) === aid
        )
    ) as Element | undefined;
    if (dependencyNode !== undefined) {
        await locateInFile(pomPath, dependencyNode);
    } else {
        throw new Error("Failed to locate the dependency.");
    }
}

async function locateInFile(pomPath: string, targetNode: Element): Promise<void> {
    if (targetNode.startIndex === null || targetNode.endIndex === null) {
        throw new UserError("Invalid target XML node to locate.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument, {preview: false});
    vscode.languages.setTextDocumentLanguage(currentDocument, "xml");
    const start = currentDocument.positionAt(targetNode.startIndex);
    const end = currentDocument.positionAt(targetNode.endIndex);
    textEditor.selection = new vscode.Selection(start, end);
    textEditor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
}
