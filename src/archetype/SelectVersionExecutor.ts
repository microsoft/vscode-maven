// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { ArchetypeMetadata, GenerateStep } from "./ArchetypeModule";
import { IArchetypeGenerateExecutor } from "./IArchetypeGenerateExecutor";

export class SelectVersionExecutor implements IArchetypeGenerateExecutor {

    public async execute(archetypeMetadata: ArchetypeMetadata): Promise<GenerateStep | undefined> {
        if (await this.showQuickPickForVersions(archetypeMetadata) === false) {
            return GenerateStep.LoadArchetypes;
        }
        return GenerateStep.Finish;
    }

    private async showQuickPickForVersions(archetypeMetadata: ArchetypeMetadata): Promise<boolean> {
        const disposables: Disposable[] = [];
        let result: boolean = false;
        try {
            result = await new Promise<boolean>((resolve, reject) => {
                const pickBox: QuickPick<QuickPickItem> = window.createQuickPick<QuickPickItem>();
                pickBox.placeholder = "Select a version ...";
                pickBox.items = archetypeMetadata.versions.map(version => ({
                    label: version
                }));
                pickBox.buttons = [(QuickInputButtons.Back)];
                disposables.push(
                    pickBox.onDidTriggerButton((item) => {
                        if (item === QuickInputButtons.Back) {
                            resolve(false);
                        }
                    }),
                    pickBox.onDidAccept(() => {
                        archetypeMetadata.version = pickBox.selectedItems[0].label;
                        resolve(true);
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
