// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as vscode from "vscode";
import { MavenProject } from "../../explorer/model/MavenProject";
import { Settings } from "../../Settings";
import { executeInTerminal } from "../../utils/mavenUtils";
import { selectProjectIfNecessary } from "../../utils/uiUtils";
import { debugCommand, IDebugOptions } from "../debugHandler";
import { FavoriteCommand } from "../../explorer/model/FavoriteCommand";

export async function runFavoriteCommandsHandler(project: MavenProject | undefined, command?: FavoriteCommand): Promise<void> {
    let selectedProject: MavenProject | undefined = project;
    if (!selectedProject) {
        selectedProject = await selectProjectIfNecessary();
    }
    if (!selectedProject) {
        return;
    }
    const favorites: FavoriteCommand[] | undefined = Settings.Terminal.favorites(selectedProject);
    if (!favorites || _.isEmpty(favorites)) {
        const BUTTON_OPEN_SETTINGS = "Open Settings";
        const choice: string | undefined = await vscode.window.showInformationMessage("Found no favorite commands. You can specify `maven.terminal.favorites` in Settings.", BUTTON_OPEN_SETTINGS);
        if (choice === BUTTON_OPEN_SETTINGS) {
            await vscode.commands.executeCommand("workbench.action.openSettings", "maven.terminal.favorites");
        }
        return;
    }

    let selectedCommand: FavoriteCommand | undefined = command;
    if (!selectedCommand) {
        selectedCommand = await vscode.window.showQuickPick(
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
    }
    if (!selectedCommand) {
        return;
    }

    const config: IDebugOptions = {
        command: selectedCommand.command,
        pomfile: selectedProject.pomPath,
        projectName: selectedProject.artifactId
    };
    if (selectedCommand.debug) {
        await debugCommand(config);
    } else {
        await executeInTerminal(config);
    }
}
