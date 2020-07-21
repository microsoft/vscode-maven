// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { MavenProject } from "../explorer/model/MavenProject";
import { Settings } from "../Settings";
import { executeInTerminal } from "../utils/mavenUtils";
import { selectProjectIfNecessary } from "../utils/uiUtils";
import { debugCommand } from "./debugHandler";

type FavoriteCommand = { command: string, alias: string, debug?: boolean };
export async function runFavoriteCommandsHandler(project: MavenProject | undefined): Promise<void> {
    let selectedProject: MavenProject | undefined = project;
    if (!selectedProject) {
        selectedProject = await selectProjectIfNecessary();
    }
    if (!selectedProject) {
        return;
    }
    const favorites: FavoriteCommand[] | undefined = Settings.Terminal.favorites(vscode.Uri.file(selectedProject.pomPath));
    if (!favorites || _.isEmpty(favorites)) {
        const BUTTON_OPEN_SETTINGS: string = "Open Settings";
        const choice: string | undefined = await vscode.window.showInformationMessage("Found no favorite commands. You can specify `maven.terminal.favorites` in Settings.", BUTTON_OPEN_SETTINGS);
        if (choice === BUTTON_OPEN_SETTINGS) {
            await vscode.commands.executeCommand("workbench.action.openSettings", "maven.terminal.favorites");
        }
        return;
    }

    const selectedCommand: FavoriteCommand | undefined = await vscode.window.showQuickPick(
        favorites.map(item => ({
            value: item,
            label: item.alias,
            description: item.command
        })), {
            ignoreFocusOut: true,
            placeHolder: "Select a favorite command ...",
            matchOnDescription: true
        }
    ).then(item => item ? item.value : undefined);
    if (!selectedCommand) {
        return;
    }

    const config: any = { command: selectedCommand.command, pomfile: selectedProject.pomPath };
    if (selectedCommand.debug) {
        await debugCommand(config);
    } else {
        await executeInTerminal(config);
    }
}
