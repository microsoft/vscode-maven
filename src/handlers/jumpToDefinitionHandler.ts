// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Dependency } from "../explorer/model/Dependency";
import { getMavenLocalRepository } from "../utils/contextUtils";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";

export async function jumpToDefinitionHandler(node?: Dependency): Promise<void> {
    if (node === undefined) {
        throw new Error("Only Dependency can jump to definition.");
    }

    let selectedPath: string;
    if (node.parent === undefined) {
        selectedPath = node.projectPomPath;
    } else {
        const parent: Dependency = <Dependency> node.parent;
        selectedPath = localPomPath(parent.groupId, parent.artifactId, parent.version);
    }
    await jumpToDefinition(selectedPath, node.artifactId);
}

async function jumpToDefinition(pomPath: string, aid: string): Promise<void> {
    const contentBuf: Buffer = await fse.readFile(pomPath);
    const projectNodes: ElementNode[] = getNodesByTag(contentBuf.toString(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: ElementNode = projectNodes[0];
    const dependenciesNode: ElementNode | undefined = projectNode.children?.find(node => node.tag === XmlTagName.Dependencies);
    const dependencyNode: ElementNode | undefined = dependenciesNode?.children && dependenciesNode?.children.find(node =>
        node.children && node.children[1].tag === XmlTagName.ArtifactId && node.children[1].text === aid
    );
    const artifactNode: ElementNode | undefined = dependencyNode?.children?.find(node => node.tag === XmlTagName.ArtifactId);
    if (artifactNode !== undefined) {
        await locateInFile(pomPath, artifactNode);
    } else {
        throw new Error("Open the wrong pom file and can not find where the dependency has been imported.");
    }
}

async function locateInFile(pomPath: string, targetNode: ElementNode): Promise<void> {
    if (targetNode.contentStart === undefined || targetNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to locate.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument, {preview: false});
    const start = currentDocument.positionAt(targetNode.contentStart);
    textEditor.selection = new vscode.Selection(start, start);
    textEditor.revealRange(new vscode.Range(start, start), vscode.TextEditorRevealType.InCenter);
}

function localPomPath(gid: string, aid: string, version: string): string {
    return path.join(getMavenLocalRepository(), ...gid.split("."), aid, version, `${aid}-${version}.pom`);
}
