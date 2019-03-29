// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as vscode from "vscode";
import { OpenDialogOptions, Uri, window } from "vscode";

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
    const OPTION_LEARN_MORE: string = "Learn more";
    const choiceForDetails: string | undefined = await window.showErrorMessage(errorMessage, OPTION_LEARN_MORE);
    if (choiceForDetails === OPTION_LEARN_MORE) {
        // open FAQs
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(TROUBLESHOOTING_LINK));
    }
}
