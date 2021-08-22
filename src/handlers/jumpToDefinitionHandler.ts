// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Dependency } from "../explorer/model/Dependency";
import { ITreeItem } from "../explorer/model/ITreeItem";
import { localPomPath } from "../utils/contextUtils";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";

export async function jumpToDefinitionHandler(node?: Dependency): Promise<void> {
    if (node === undefined) {
        throw new Error("No dependency node specified.");
    }

    let selectedPath: string;
    const parent: Dependency | ITreeItem = node.parent;
    if (parent instanceof Dependency) {
        selectedPath = localPomPath(parent.groupId, parent.artifactId, parent.version);
    } else {
        selectedPath = node.projectPomPath;
    }
    await goToDefinition(selectedPath, node.groupId, node.artifactId);
}

async function goToDefinition(pomPath: string, gid: string, aid: string): Promise<void> {
    const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(pomPath), {preserveFocus: true});
    const projectNodes: ElementNode[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: ElementNode = projectNodes[0];
    const dependenciesNode: ElementNode | undefined = projectNode.children?.find(node => node.tag === XmlTagName.Dependencies);
    const dependencyNode: ElementNode | undefined = dependenciesNode?.children?.find(node =>
        node.children?.find(id => id.tag === XmlTagName.GroupId && id.text === gid) !== undefined &&
        node.children?.find(id => id.tag === XmlTagName.ArtifactId && id.text === aid) !== undefined
    );
    const artifactNode: ElementNode | undefined = dependencyNode?.children?.find(node => node.tag === XmlTagName.ArtifactId);
    if (artifactNode !== undefined) {
        await locateInFile(pomPath, artifactNode);
    } else {
        throw new Error("Failed to locate the dependency.");
    }
}

async function locateInFile(pomPath: string, targetNode: ElementNode): Promise<void> {
    if (targetNode.contentStart === undefined || targetNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to locate.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument, {preview: false});
    vscode.languages.setTextDocumentLanguage(currentDocument, "xml");
    const start = currentDocument.positionAt(targetNode.contentStart);
    textEditor.selection = new vscode.Selection(start, start);
    textEditor.revealRange(new vscode.Range(start, start), vscode.TextEditorRevealType.InCenter);
}
