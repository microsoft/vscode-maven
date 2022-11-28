// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Settings } from "../../Settings";
import * as vscode from "vscode";

export async function addFavoriteHandler() {

    const command = await vscode.window.showInputBox({
        title: "Add favorite",
        ignoreFocusOut: true,
        prompt: "Input a command for your favorite execute.",
        placeHolder: "e.g. clean install",
        validateInput: (text: string) => {
            if (text.trim().length < 2) {
                return "Command is too short.";
            }
            return undefined;
        }
    });

    if (!command) {
        return;
    }

    Settings.storeFavorite({command, debug: false});
}