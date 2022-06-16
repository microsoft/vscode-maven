// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element } from "domhandler";
import * as vscode from "vscode";
import { Dependency } from "../../explorer/model/Dependency";
import { localPomPath } from "../../utils/contextUtils";
import { UserError } from "../../utils/errorUtils";
import { getDependencyNode } from "./utils";

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
    const dependencyNode = await getDependencyNode(pomPath, gid, aid);
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
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument, { preview: false });
    vscode.languages.setTextDocumentLanguage(currentDocument, "xml");
    const start = currentDocument.positionAt(targetNode.startIndex);
    const end = currentDocument.positionAt(targetNode.endIndex);
    textEditor.selection = new vscode.Selection(start, end);
    textEditor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenter);
}
