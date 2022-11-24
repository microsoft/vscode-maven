// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Settings } from "../../Settings";
import * as vscode from "vscode";

export async function addFavoriteHandler() {

    const alias = await vscode.window.showInputBox({
        title: "Add favorite",
        ignoreFocusOut: true,
        prompt: "Input an alias for your favorite.",
        placeHolder: "e.g. Clean and Build Project",
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

    const debugMode = await vscode.window.showQuickPick(
        ["true", "false"],
        {
            title: "Add favorite",
            placeHolder: "Is it to execute in debug mode?",
        }
    );

    if (!debugMode) {
        return;
    }

    // store favorite into workspace settings
    const debug: boolean = debugMode === 'true';
    Settings.storeFavorite({alias, command, debug});
}