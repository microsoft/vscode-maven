// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export class SpecifyArchetypeVersionStep implements IProjectCreationStep {
    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const disposables: Disposable[] = [];
        let result: StepResult;
        try {
            result = await new Promise<StepResult>((resolve, reject) => {
                if (metadata.archetype?.versions === undefined) {
                    reject();
                    return;
                }

                const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                pickBox.title = "Create Maven Project: Choose version";
                pickBox.placeholder = "Select a version ...";
                pickBox.items = metadata.archetype?.versions.map(version => ({
                    label: version
                }));
                pickBox.buttons = [(QuickInputButtons.Back)];
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
                        reject();
                    })
                );
                disposables.push(pickBox);
                pickBox.show();
            });
        } finally {
            for (const d of disposables) {
                d.dispose();
            }
        }
        return result;
    }
}
