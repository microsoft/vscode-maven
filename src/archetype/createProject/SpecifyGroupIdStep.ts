// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, InputBox, QuickInputButtons, window } from "vscode";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyGroupIdStep implements IProjectCreationStep {
    public previousStep?: IProjectCreationStep;
    public nextStep?: IProjectCreationStep;

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        if (metadata.groupId) {
            // groupId already specified, skip this step
            // and remap nextStep's previousStep to this step's previousStep
            if (this.nextStep) {
                this.nextStep.previousStep = this.previousStep;
            }
            return StepResult.NEXT;
        }

        if (this.nextStep) {
            this.nextStep.previousStep = this;
        }

        const disposables: Disposable[] = [];
        const specifyGroupIdPromise = new Promise<StepResult>((resolve) => {
            const inputBox: InputBox = window.createInputBox();
            inputBox.title = metadata.title;
            inputBox.placeholder = "e.g. com.example";
            inputBox.prompt = "Input group Id of your project.";
            inputBox.value = metadata.groupId ?? (metadata.parentProject ? metadata.parentProject.groupId : "com.example");
            inputBox.ignoreFocusOut = true;
            if (this.previousStep) {
                inputBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    inputBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(StepResult.PREVIOUS);
                        }
                    })
                );
            }
            disposables.push(
                inputBox.onDidChangeValue(() => {
                    const validationMessage: string | undefined = this.groupIdValidation(inputBox.value);
                    // inputBox.enabled = validationMessage === undefined;
                    inputBox.validationMessage = validationMessage;
                }),
                inputBox.onDidAccept(() => {
                    if (!inputBox.validationMessage) {
                        metadata.groupId = inputBox.value;
                        resolve(StepResult.NEXT);
                    }
                }),
                inputBox.onDidHide(() => {
                    resolve(StepResult.STOP);
                })
            );
            disposables.push(inputBox);
            inputBox.show();
        });

        try {
            return await specifyGroupIdPromise;
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    private groupIdValidation(value: string): string | undefined {
        return (/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(value)) ? undefined : "Invalid Group Id";
    }
}
