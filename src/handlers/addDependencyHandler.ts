// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { getArtifacts, IArtifactMetadata } from "../completion/requestUtils";

export async function addDependencyHandler(pomPath: string): Promise<void> {
    const keywordString: string = await vscode.window.showInputBox({ ignoreFocusOut: true, placeHolder: "input artifact keywords" });
    if (!keywordString) {
        return;
    }
    const artifacts: IArtifactMetadata[] = await getArtifacts(keywordString.trim().split(/[-,. :]/));
    const selectedDoc: IArtifactMetadata = await vscode.window.showQuickPick(
        artifacts.map(artifact => ({ value: artifact, label: `$(package) ${artifact.a}`, description: artifact.g }))
    ).then(selected => selected && selected.value);
    if (!selectedDoc) {
        return;
    }
    await addDependency(selectedDoc.g, selectedDoc.a, selectedDoc.latestVersion, pomPath);
}

async function addDependency(_gid: string, _aid: string, _version: string, _pomPath: string): Promise<void> {
    // const _text: string = await fse.readFile(pomPath, "utf-8");
    // Find out <dependencies> node and insert content.
    throw new Error("Not Implemented");
}
