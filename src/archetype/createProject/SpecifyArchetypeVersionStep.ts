// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyArchetypeVersionStep implements IProjectCreationStep {
    public previousStep?: IProjectCreationStep;

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const disposables: Disposable[] = [];
        const specifyAchetypeVersionPromise = new Promise<StepResult>((resolve, reject) => {
            if (metadata.archetype?.versions === undefined) {
                reject("Invalid archetype selected.");
                return;
            }

            const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
            pickBox.title = "Create Maven Project";
            pickBox.placeholder = "Select a version ...";
            pickBox.items = metadata.archetype.versions.map(version => ({
                label: version
            }));
            if (this.previousStep) {
                pickBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    pickBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(StepResult.PREVIOUS);
                        }
                    })
                );
            }
            disposables.push(
                pickBox.onDidTriggerButton((item) => {
                    if (item === QuickInputButtons.Back) {
                        resolve(StepResult.PREVIOUS);
                    }
                }),
                pickBox.onDidAccept(() => {
                    metadata.archetypeVersion = pickBox.selectedItems[0].label;
                    resolve(StepResult.NEXT);
                }),
                pickBox.onDidHide(() => {
                    resolve(StepResult.STOP);
                })
            );
            disposables.push(pickBox);
            pickBox.show();
        });

        try {
            return await specifyAchetypeVersionPromise;
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
