// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Dependency } from "../explorer/model/Dependency";
import { getIndentation } from "../utils/editUtils";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";

export async function excludeDependencyHandler(toExclude?: Dependency): Promise<void> {
    if (toExclude === undefined) {
        throw new UserError("Only Dependency can be excluded.");
    }
    const root: Dependency | undefined =  toExclude.root ? <Dependency> toExclude.root : undefined;
    if (root === undefined || toExclude.fullName === root.fullName) {
        vscode.window.showInformationMessage("The dependency written in pom can not be excluded.");
        return;
    }
    const pomPath: string = toExclude.projectPomPath;
    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }
    await excludeDependency(pomPath, toExclude.groupId, toExclude.artifactId, root.artifactId);
}

async function excludeDependency(pomPath: string, gid: string, aid: string, rootAid: string): Promise<void> {
    //find out <dependencies> node with artifactId === rootAid and insert <exclusions> node
    const contentBuf: Buffer = await fse.readFile(pomPath);
    const projectNodes: ElementNode[] = getNodesByTag(contentBuf.toString(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: ElementNode = projectNodes[0];
    const dependenciesNode: ElementNode | undefined = projectNode.children && projectNode.children.find(node => node.tag === XmlTagName.Dependencies);
    const dependencyNode: ElementNode | undefined = dependenciesNode?.children && dependenciesNode?.children.find(node => node.children && node.children[1].tag === XmlTagName.ArtifactId && node.children[1].text === rootAid);
    if (dependencyNode === undefined) {
        throw new Error(`Failed to find the dependency where ${gid}:${aid} is introduced.`);
    } else {
        await insertExcludeDependency(pomPath, dependencyNode, gid, aid);
    }
}

async function insertExcludeDependency(pomPath: string, targetNode: ElementNode, gid: string, aid: string): Promise<void> {
    if (targetNode.children === undefined || targetNode.contentStart === undefined || targetNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to delete dependency.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, targetNode.contentEnd);
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces ? " ".repeat(<number>options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    let insertPosition: vscode.Position;
    let targetText: string;
    const exclusionNode: ElementNode | undefined = targetNode.children && targetNode.children.find(node => node.tag === XmlTagName.Exclusions);
    if (exclusionNode === undefined) {
        insertPosition = currentDocument.positionAt(targetNode.contentEnd);
        targetText = constructExclusionsNode(gid, aid, baseIndent, indent, eol);
    } else {
        if (exclusionNode.contentStart === undefined) {
            throw new UserError("Invalid insert position.");
        }
        insertPosition = currentDocument.positionAt(exclusionNode.contentStart);
        targetText = constructExclusionNode(gid, aid, baseIndent, indent, eol);
    }
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.insert(currentDocument.uri, insertPosition, targetText);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
    vscode.workspace.saveAll();
}

function constructExclusionsNode(gid: string, aid: string, baseIndent: string, indent: string, eol: string): string {
    return [
        `${indent}<exclusions>`,
        `${indent}<exclusion>`,
        `${indent}${indent}<artifactId>${aid}</artifactId>`,
        `${indent}${indent}<groupId>${gid}</groupId>`,
        `${indent}</exclusion>`,
        `</exclusions>${eol}${baseIndent}`
    ].join(`${eol}${baseIndent}${indent}`);
}

function constructExclusionNode(gid: string, aid: string, baseIndent: string, indent: string, eol: string): string {
    return [
        `${eol}${baseIndent}${indent}${indent}<exclusion>`,
        `${indent}${indent}<artifactId>${aid}</artifactId>`,
        `${indent}${indent}<groupId>${gid}</groupId>`,
        `${indent}</exclusion>`
    ].join(`${eol}${baseIndent}${indent}`);
}
