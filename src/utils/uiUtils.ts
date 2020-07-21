// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as vscode from "vscode";
import { OpenDialogOptions, Uri, window } from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { mavenOutputChannel } from "../mavenOutputChannel";

const TROUBLESHOOTING_LINK: string = "https://github.com/Microsoft/vscode-maven/blob/master/Troubleshooting.md";

// file chooser dialog
export async function openDialogForFolder(customOptions: OpenDialogOptions): Promise<Uri | undefined> {
    const options: OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false
    };
    const result: Uri[] | undefined = await window.showOpenDialog(Object.assign(options, customOptions));
    if (result && result.length > 0) {
        return Promise.resolve(result[0]);
    } else {
        return Promise.resolve(undefined);
    }
}

export async function openDialogForFile(customOptions?: OpenDialogOptions): Promise<Uri | undefined> {
    const options: OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false
    };
    const result: Uri[] | undefined = await window.showOpenDialog(Object.assign(options, customOptions));
    if (result && result.length > 0) {
        return Promise.resolve(result[0]);
    } else {
        return Promise.resolve(undefined);
    }
}

// editor
export async function openFileIfExists(filepath: string): Promise<void> {
    if (await fs.pathExists(filepath)) {
        window.showTextDocument(Uri.file(filepath));
    }
}

// Troubleshooting
export async function showTroubleshootingDialog(errorMessage: string): Promise<void> {
    const OPTION_SHOW_OUTPUT: string = "Show Output";
    const OPTION_LEARN_MORE: string = "Learn More";
    const choiceForDetails: string | undefined = await window.showErrorMessage(errorMessage, OPTION_SHOW_OUTPUT, OPTION_LEARN_MORE);
    if (choiceForDetails === OPTION_LEARN_MORE) {
        // open FAQs
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(TROUBLESHOOTING_LINK));
    } else if (choiceForDetails === OPTION_SHOW_OUTPUT) {
        mavenOutputChannel.show();
    }
}

export async function selectProjectIfNecessary(): Promise< MavenProject | undefined> {
    if (!mavenExplorerProvider.mavenProjectNodes || mavenExplorerProvider.mavenProjectNodes.length === 0) {
        return undefined;
    }
    if (mavenExplorerProvider.mavenProjectNodes.length === 1) {
        return mavenExplorerProvider.mavenProjectNodes[0];
    }
    return await window.showQuickPick(
        mavenExplorerProvider.mavenProjectNodes.map(item => ({
            value: item,
            label: `$(primitive-dot) ${item.name}`,
            description: undefined,
            detail: item.pomPath
        })),
        { placeHolder: "Select a Maven project ...", ignoreFocusOut: true }
    ).then(item => item ? item.value : undefined);
}
