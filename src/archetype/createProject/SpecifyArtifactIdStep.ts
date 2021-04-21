// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { window } from "vscode";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyArtifactIdStep implements IProjectCreationStep {
    private artifactIdValidation(value: string): string | undefined {
        return (/^[a-z_][a-z0-9_]*(-[a-z_][a-z0-9_]*)*$/.test(value)) ? undefined : "Invalid Artifact Id";
    }

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const artifactId = await window.showInputBox({
            value: metadata.artifactId,
            validateInput: this.artifactIdValidation,
            placeHolder: "e.g. demo",
            prompt: "Input Artifact Id for your project."
        });
        if (artifactId === undefined) {
            return StepResult.STOP;
        } else {
            metadata.artifactId = artifactId;
            return StepResult.NEXT;
        }
    }
}
