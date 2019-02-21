// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { getArtifacts, IArtifactMetadata } from "../completion/requestUtils";

export async function addDependencyHandler(document: vscode.TextDocument): Promise<void> {
    const keywordString: string = await vscode.window.showInputBox({ ignoreFocusOut: true, placeHolder: "input artifact keywords" });
    if (!keywordString) {
        return;
    }
    // const artifacts: IArtifactMetadata[] = await getArtifacts(keywordString.trim().split(/[-,. :]/));
    const selectedDoc: IArtifactMetadata = await vscode.window.showQuickPick(
        getArtifacts(keywordString.trim().split(/[-,. :]/)).then(artifacts => artifacts.map(artifact => ({ value: artifact, label: `$(package) ${artifact.a}`, description: artifact.g }))
    )).then(selected => selected && selected.value);
    if (!selectedDoc) {
        return;
    }
    await addDependency(selectedDoc.g, selectedDoc.a, selectedDoc.latestVersion, document);
}

async function addDependency(gid: string, aid: string, version: string, document: vscode.TextDocument): Promise<void> {
    // Find out <dependencies> node and insert content.
    // throw new Error("Not Implemented");
    const targetRange: vscode.Range = new vscode.Range(document.positionAt(0), document.positionAt(0)); // TODO
    const targetText: string = constructDependencyNode(gid, aid, version);
    const textEdit: vscode.TextEdit = new vscode.TextEdit(targetRange, targetText);
    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.set(document.uri, [textEdit]);
    vscode.workspace.applyEdit(edit);
}

function constructDependencyNode(gid: string, aid: string, version: string): string {
    return [
        "\n<dependency>",
        `\t<groupId>${gid}</groupId>`,
        `\t<artifactId>${aid}</artifactId>`,
        `\t<version>${version}</version>`,
        "</dependency>\n"
    ].join("\n");
}
