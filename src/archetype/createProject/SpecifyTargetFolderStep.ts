// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { pathExistsSync } from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { openDialogForFolder } from "../../utils/uiUtils";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyTargetFolderStep implements IProjectCreationStep {

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        if (!metadata.artifactId) {
            return StepResult.STOP;
        }

        // if parent project is specified, use its folder as default target folder.
        if (metadata.parentProject) {
            metadata.targetFolder = path.join(metadata.parentProject.pomPath, "../");
            return StepResult.NEXT;
        }
        const LABEL_CHOOSE_FOLDER = "Select Destination Folder";
        const OPTION_CONTINUE = "Continue";
        const OPTION_CHOOSE_ANOTHER_FOLDER = "Choose another folder";
        const OPTION_CHANGE_PROJECT_NAME = "Change project name";
        const MESSAGE_EXISTING_FOLDER = `A folder [${metadata.artifactId}] already exists in the selected folder.`;

        // choose target folder.
        let result: vscode.Uri | undefined = await openDialogForFolder({
            defaultUri: metadata.targetFolderHint !== undefined ? vscode.Uri.file(metadata.targetFolderHint) : undefined,
            openLabel: LABEL_CHOOSE_FOLDER
        });
        while (result && pathExistsSync(path.join(result.fsPath, metadata.artifactId))) {
            const overrideChoice = await vscode.window.showWarningMessage(MESSAGE_EXISTING_FOLDER, OPTION_CONTINUE, OPTION_CHOOSE_ANOTHER_FOLDER, OPTION_CHANGE_PROJECT_NAME);
            if (overrideChoice === OPTION_CHOOSE_ANOTHER_FOLDER) {
                result = await openDialogForFolder({
                    defaultUri: result,
                    openLabel: LABEL_CHOOSE_FOLDER
                });
            } else if (overrideChoice === OPTION_CHANGE_PROJECT_NAME) {
                return StepResult.PREVIOUS;
            } else {
                break;
            }
        }

        const targetFolder: string | undefined = result?.fsPath;
        if (targetFolder === undefined) {
            return StepResult.STOP;
        }
        metadata.targetFolder = targetFolder;
        return StepResult.NEXT;
    }
}
