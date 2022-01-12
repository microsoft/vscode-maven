// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri } from "vscode";
import { openDialogForFolder } from "../../utils/uiUtils";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyTargetFolderStep implements IProjectCreationStep {

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        // choose target folder.
        const result: Uri | undefined = await openDialogForFolder({
            defaultUri: metadata.targetFolderHint !== undefined ? Uri.file(metadata.targetFolderHint) : undefined,
            openLabel: "Select Destination Folder"
        });
        const targetFolder: string | undefined = result?.fsPath;
        if (targetFolder === undefined) {
            return StepResult.STOP;
        }
        metadata.targetFolder = targetFolder;
        return StepResult.NEXT;
    }
}
