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

    const alias = await vscode.window.showInputBox({
        title: "Add favorite",
        ignoreFocusOut: true,
        prompt: "Input an alias for your favorite.",
        placeHolder: "e.g. Clean and Build Project",
        value: command,
        validateInput: (text: string) => {
            if (text.trim().length < 3) {
                return "Favorite is too short.";
            }
            return undefined;
        }
    });

    if (!alias) {
        return;
    }

    const executionMode = await vscode.window.showQuickPick(
        ["Run", "Debug"],
        {
            title: "Add favorite",
            placeHolder: "Select the command execution mode...",
        }
    );

    if (!executionMode) {
        return;
    }

    // store favorite into workspace settings
    const debug: boolean = executionMode === 'Debug';
    Settings.storeFavorite({alias, command, debug});
}