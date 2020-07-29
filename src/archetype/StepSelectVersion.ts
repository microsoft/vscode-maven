// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { ArchetypeMetadata, steps } from "./ArchetypeModule";
import { IStep } from "./IStep";

export class StepSelectVersion implements IStep {

    public async execute(archetypeMetadata: ArchetypeMetadata): Promise<IStep | undefined> {
        if (await this.showQuickPickForVersions(archetypeMetadata) === false) {
            steps.currentStep -= 1;
            return steps.stepLoadArchetypes;
        }
        if (archetypeMetadata.version !== undefined) {
            steps.currentStep += 1;
        }
        return undefined;
    }

    private async showQuickPickForVersions(archetypeMetadata: ArchetypeMetadata): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
            pickBox.placeholder = "Select a version ...";
            pickBox.items = archetypeMetadata.versions.map(version => ({
                label: version
            }));
            pickBox.buttons = [(QuickInputButtons.Back)];
            pickBox.onDidTriggerButton((item) => {
                if (item === QuickInputButtons.Back) {
                    resolve(false);
                    pickBox.dispose();
                }
            });
            pickBox.onDidAccept(() => {
                archetypeMetadata.version = pickBox.selectedItems[0].label;
                resolve(true);
                pickBox.dispose();
            });
            pickBox.onDidHide(() => {
                reject();
                pickBox.dispose();
            });
            pickBox.show();
        });
    }
}
