// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as vscode from "vscode";
import { InputBoxOptions, OpenDialogOptions, QuickPickItem, QuickPickOptions, Uri, window } from "vscode";

export namespace VSCodeUI {
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

    // Quick pick
    export async function getQuickPick<T>(
        itemsSource: T[] | Promise<T[]>,
        labelfunc: (item: T) => string, descfunc: (item: T) => string,
        detailfunc: (item: T) => string, options?: QuickPickOptions
    ): Promise<T> {
        const itemWrappersPromise: Promise<IQuickPickItemEx<T>[]> = new Promise<IQuickPickItemEx<T>[]>(
            async (resolve: (value: IQuickPickItemEx<T>[]) => void, _reject: (e: Error) => void): Promise<void> => {
                const ret: IQuickPickItemEx<T>[] = (await itemsSource).map((item: T) => Object.assign({}, {
                    description: (descfunc && descfunc(item)),
                    detail: (detailfunc && detailfunc(item)),
                    label: (labelfunc && labelfunc(item)),
                    value: item
                }));
                resolve(ret);
            }
        );

        const selected: IQuickPickItemEx<T> = await window.showQuickPick(itemWrappersPromise, Object.assign({ ignoreFocusOut: true }, options));
        return selected && selected.value;
    }

    // Inputbox
    export async function getFromInputBox(options?: InputBoxOptions): Promise<string> {
        return await window.showInputBox(Object.assign({ ignoreFocusOut: true }, options));

    }

    // Troubleshooting
    export async function showTroubleshootingDialog(errorMessage: string): Promise<void> {
        const OPTION_LEARN_MORE: string = "Learn more";
        const choiceForDetails: string = await window.showErrorMessage(errorMessage, OPTION_LEARN_MORE);
        if (choiceForDetails === OPTION_LEARN_MORE) {
            // open FAQs
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(TROUBLESHOOTING_LINK));
        }
    }
}

interface IQuickPickItemEx<T> extends QuickPickItem {
    value: T;
}
