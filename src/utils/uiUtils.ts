// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as vscode from "vscode";
import { OpenDialogOptions, Uri, window } from "vscode";

const TROUBLESHOOTING_LINK: string = "https://github.com/Microsoft/vscode-maven/blob/master/Troubleshooting.md";

// file chooser dialog
export async function openDialogForFolder(customOptions: OpenDialogOptions): Promise<Uri> {
    const options: OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false
    };
    const result: Uri[] = await window.showOpenDialog(Object.assign(options, customOptions));
    if (result && result.length) {
        return Promise.resolve(result[0]);
    } else {
        return Promise.resolve(null);
    }
}

export async function openDialogForFile(customOptions?: OpenDialogOptions): Promise<Uri> {
    const options: OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false
    };
    const result: Uri[] = await window.showOpenDialog(Object.assign(options, customOptions));
    if (result && result.length) {
        return Promise.resolve(result[0]);
    } else {
        return Promise.resolve(null);
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
    const choiceForDetails: string = await window.showErrorMessage(errorMessage, OPTION_LEARN_MORE);
    if (choiceForDetails === OPTION_LEARN_MORE) {
        // open FAQs
        vscode.env.openExternal(vscode.Uri.parse(TROUBLESHOOTING_LINK));
    }
}
