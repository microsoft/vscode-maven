// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";
import { getArtifacts, IArtifactMetadata } from "../utils/requestUtils";

export async function addDependencyHandler(options?: { pomPath?: string }): Promise<void> {
    let pomPath: string;
    if (options && options.pomPath) {
        pomPath = options.pomPath;
    } else {
        // select a project(pomfile)
        const selectedProject: MavenProject | undefined = await vscode.window.showQuickPick(
            mavenExplorerProvider.mavenProjectNodes.map(item => ({
                value: item,
                label: `$(primitive-dot) ${item.name}`,
                description: undefined,
                detail: item.pomPath
            })),
            { placeHolder: "Select a Maven project ...", ignoreFocusOut: true }
        ).then(item => item ? item.value : undefined);
        if (!selectedProject) {
            return;
        }
        pomPath = selectedProject.pomPath;
    }

    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }

    const keywordString: string | undefined = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        prompt: "Input keywords to search artifacts from Maven Central Repository.",
        placeHolder: "e.g. spring azure storage",
        validateInput: (text: string) => {
            if (text.trim().length < 3) {
                return "Keywords are too short.";
            }
            return undefined;
        }
    });
    if (!keywordString) {
        return;
    }

    const selectedDoc: IArtifactMetadata | undefined = await vscode.window.showQuickPick<vscode.QuickPickItem & { value: IArtifactMetadata }>(
        getArtifacts(keywordString.trim().split(/[-,. :]/)).then(artifacts => artifacts.map(artifact => ({ value: artifact, label: `$(package) ${artifact.a}`, description: artifact.g }))),
        { placeHolder: "Select a dependency ..." }
    ).then(selected => selected ? selected.value : undefined);
    if (!selectedDoc) {
        return;
    }
    await addDependency(pomPath, selectedDoc.g, selectedDoc.a, selectedDoc.latestVersion);
}

async function addDependency(pomPath: string, gid: string, aid: string, version: string): Promise<void> {
    if (!vscode.window.activeTextEditor) {
        throw new UserError("No POM file is open.");
    }

    // Find out <dependencies> node and insert content.
    const contentBuf: Buffer = await fse.readFile(pomPath);
    const projectNodes: ElementNode[] = getNodesByTag(contentBuf.toString(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const proejctNode: ElementNode = projectNodes[0];
    const dependenciesNode: ElementNode | undefined = proejctNode.children && proejctNode.children.find(node => node.tag === XmlTagName.Dependencies);
    if (dependenciesNode !== undefined) {
        await insertDependency(pomPath, dependenciesNode, gid, aid, version);
    } else {
        await insertDependency(pomPath, proejctNode, gid, aid, version);

    }
}

async function insertDependency(pomPath: string, targetNode: ElementNode, gid: string, aid: string, version: string): Promise<void> {
    if (targetNode.contentStart === undefined || targetNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to insert dependency.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, targetNode.contentEnd);
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces ? " ".repeat(<number>options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    let insertPosition: vscode.Position;
    let targetText: string;
    if (targetNode.tag === XmlTagName.Dependencies) {
        insertPosition = currentDocument.positionAt(targetNode.contentStart);
        targetText = constructDependencyNode(gid, aid, version, baseIndent, indent, eol);
    } else if (targetNode.tag === XmlTagName.Project) {
        insertPosition = currentDocument.positionAt(targetNode.contentEnd);
        targetText = constructDependenciesNode(gid, aid, version, baseIndent, indent, eol);
    } else {
        return;
    }

    const targetRange: vscode.Range = new vscode.Range(insertPosition, insertPosition);
    const textEdit: vscode.TextEdit = new vscode.TextEdit(targetRange, targetText);
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.set(currentDocument.uri, [textEdit]);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
}

function constructDependencyNode(gid: string, aid: string, version: string, baseIndent: string, indent: string, eol: string): string {
    return [
        eol,
        "<dependency>",
        `${indent}<groupId>${gid}</groupId>`,
        `${indent}<artifactId>${aid}</artifactId>`,
        `${indent}<version>${version}</version>`,
        `</dependency>${eol}`
    ].join(`${eol}${baseIndent}${indent}`);
}

function constructDependenciesNode(gid: string, aid: string, version: string, baseIndent: string, indent: string, eol: string): string {
    return [
        eol,
        "<dependencies>",
        `${indent}<dependency>`,
        `${indent}${indent}<groupId>${gid}</groupId>`,
        `${indent}${indent}<artifactId>${aid}</artifactId>`,
        `${indent}${indent}<version>${version}</version>`,
        `${indent}</dependency>`,
        `</dependencies>${eol}`
    ].join(`${eol}${baseIndent}${indent}`);
}

function getIndentation(document: vscode.TextDocument, offset: number): string {
    const closingTagPosition: vscode.Position = document.positionAt(offset);
    return document.getText(new vscode.Range(
        new vscode.Position(closingTagPosition.line, 0),
        closingTagPosition
    ));
}
