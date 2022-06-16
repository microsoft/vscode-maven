// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag } from "domhandler";
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Dependency } from "../../explorer/model/Dependency";
import { getIndentation } from "../../utils/editUtils";
import { UserError } from "../../utils/errorUtils";
import { getInnerEndIndex, getInnerStartIndex, XmlTagName } from "../../utils/lexerUtils";
import { getDependencyNode } from "./utils";

export async function excludeDependencyHandler(toExclude?: Dependency): Promise<void> {
    if (toExclude === undefined) {
        throw new UserError("Only Dependency can be excluded.");
    }
    const root: Dependency = toExclude.root;
    if (root === undefined || toExclude.fullArtifactName === root.fullArtifactName) {
        vscode.window.showInformationMessage("The dependency written in pom can not be excluded.");
        return;
    }
    const pomPath: string = toExclude.projectPomPath;
    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }
    await excludeDependency(pomPath, toExclude.groupId, toExclude.artifactId, root.groupId, root.artifactId);
}

async function excludeDependency(pomPath: string, gid: string, aid: string, rootGid: string, rootAid: string): Promise<void> {
    // find out <dependencies> node with artifactId === rootAid and insert <exclusions> node
    const dependencyNode = await getDependencyNode(pomPath, rootGid, rootAid);
    if (dependencyNode === undefined) {
        throw new Error(`Failed to find the dependency where ${gid}:${aid} is introduced.`);
    } else {
        await insertExcludeDependency(pomPath, dependencyNode, gid, aid);
    }
}

async function insertExcludeDependency(pomPath: string, targetNode: Element, gid: string, aid: string): Promise<void> {
    if (targetNode.children.length === 0) {
        throw new UserError("Invalid target XML node to delete dependency.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, getInnerEndIndex(targetNode));
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces && typeof options.tabSize === "number" ? " ".repeat(options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    let insertPosition: vscode.Position;
    let targetText: string;
    const exclusionNode: Element | undefined = targetNode.children?.find(node => isTag(node) && node.tagName === XmlTagName.Exclusions) as Element | undefined;
    if (exclusionNode === undefined) {
        insertPosition = currentDocument.positionAt(getInnerEndIndex(targetNode));
        targetText = constructExclusionsNode(gid, aid, baseIndent, indent, eol);
    } else {
        insertPosition = currentDocument.positionAt(getInnerStartIndex(exclusionNode));
        targetText = constructExclusionNode(gid, aid, baseIndent, indent, eol);
    }
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.insert(currentDocument.uri, insertPosition, targetText);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
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
