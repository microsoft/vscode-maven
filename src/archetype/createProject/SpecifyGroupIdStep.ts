// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { window } from "vscode";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyGroupIdStep implements IProjectCreationStep {
    private groupIdValidation(value: string): string | undefined {
        return (/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(value)) ? undefined : "Invalid Group Id";
    }

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const groupId = await window.showInputBox({
            value: metadata.groupId,
            validateInput: this.groupIdValidation,
            placeHolder: "e.g. com.example",
            prompt: "Input Group Id for your project."
        });
        if (groupId === undefined) {
            return StepResult.STOP;
        } else {
            metadata.groupId = groupId;
            return StepResult.NEXT;
        }
    }
}
