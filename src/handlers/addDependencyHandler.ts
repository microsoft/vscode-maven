// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { ElementNode, getNodesByTag, XmlTagName } from "../completion/lexerUtils";
import { getArtifacts, IArtifactMetadata } from "../completion/requestUtils";

export async function addDependencyHandler(document: vscode.TextDocument): Promise<void> {
    const keywordString: string = await vscode.window.showInputBox({
        ignoreFocusOut: true,
        prompt: "Input keywords to search artifacts from Maven Central Repository.",
        placeHolder: "e.g. spring azure storage"
    });
    if (!keywordString) {
        return;
    }

    const selectedDoc: IArtifactMetadata = await vscode.window.showQuickPick(
        getArtifacts(keywordString.trim().split(/[-,. :]/)).then(artifacts => artifacts.map(artifact => ({ value: artifact, label: `$(package) ${artifact.a}`, description: artifact.g }))),
        { placeHolder: "Select a dependency ..." }
    ).then(selected => selected && selected.value);
    if (!selectedDoc) {
        return;
    }
    await addDependency(selectedDoc.g, selectedDoc.a, selectedDoc.latestVersion, document);
}

async function addDependency(gid: string, aid: string, version: string, document: vscode.TextDocument): Promise<void> {
    // Find out <dependencies> node and insert content.
    const projectNodes: ElementNode[] = getNodesByTag(document.getText(), XmlTagName.Project);
    if (!projectNodes || projectNodes.length !== 1) {
        throw new Error("Only support POM file with single <project> node.");
    }

    const proejctNode: ElementNode = projectNodes[0];
    const dependenciesNode: ElementNode = proejctNode.children && proejctNode.children.find(node => node.tag === XmlTagName.Dependencies);
    if (dependenciesNode !== undefined) {
        insertDependency(document, dependenciesNode, gid, aid, version);
    } else {
        insertDependency(document, proejctNode, gid, aid, version);

    }
}

async function insertDependency(document: vscode.TextDocument, targetNode: ElementNode, gid: string, aid: string, version: string): Promise<void> {
    const indent: string = getIndentation(document, targetNode);
    let insertPosition: vscode.Position;
    let targetText: string;
    if (targetNode.tag === XmlTagName.Dependencies) {
        insertPosition = document.positionAt(targetNode.contentStart);
        targetText = constructDependencyNode(gid, aid, version, indent);
    } else if (targetNode.tag === XmlTagName.Project) {
        insertPosition = document.positionAt(targetNode.contentEnd);
        targetText = constructDependenciesNode(gid, aid, version, indent);
    } else {
        return;
    }
    const targetRange: vscode.Range = new vscode.Range(insertPosition, insertPosition);
    const textEdit: vscode.TextEdit = new vscode.TextEdit(targetRange, targetText);
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.set(document.uri, [textEdit]);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = document.positionAt(document.offsetAt(insertPosition) + targetText.length);
    vscode.window.activeTextEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
}

function constructDependencyNode(gid: string, aid: string, version: string, indent: string = ""): string {
    return [
        "",
        "<dependency>",
        `${indent}<groupId>${gid}</groupId>`,
        `${indent}<artifactId>${aid}</artifactId>`,
        `${indent}<version>${version}</version>`,
        "</dependency>"
    ].join(`\n${indent || ""}${indent}`);
}

function constructDependenciesNode(gid: string, aid: string, version: string, baseIndent: string = ""): string {
    const options: vscode.TextEditorOptions = vscode.window.activeTextEditor.options;
    const indent: string = options.insertSpaces ? " ".repeat(<number>options.tabSize) : "\t";
    return [
        "",
        "<dependencies>",
        `${indent}<dependency>`,
        `${indent}${indent}<groupId>${gid}</groupId>`,
        `${indent}${indent}<artifactId>${aid}</artifactId>`,
        `${indent}${indent}<version>${version}</version>`,
        `${indent}</dependency>`,
        "</dependencies>"
    ].join(`\n${baseIndent || ""}${indent}`);
}

function getIndentation(document: vscode.TextDocument, targetNode: ElementNode): string {
    const closingTagPosition: vscode.Position = document.positionAt(targetNode.contentEnd);
    return document.getText(new vscode.Range(
        new vscode.Position(closingTagPosition.line, 0),
        closingTagPosition
    ));

}
