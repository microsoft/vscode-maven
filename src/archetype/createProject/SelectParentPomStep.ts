import { pathExistsSync } from "fs-extra";
import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { MavenProjectManager } from "../../project/MavenProjectManager";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";
import { MavenProject } from "../../explorer/model/MavenProject";

interface ParentPomPickItem extends QuickPickItem {
    parentProject?: MavenProject;
}

export class SelectParentPom implements IProjectCreationStep {
    previousStep?: IProjectCreationStep | undefined;

    async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const items: ParentPomPickItem[] = [
            {
                label: "<None>",
                parentProject: undefined
            }
        ];
        MavenProjectManager.projects
            .filter(project => project.artifactId && project.pomPath && pathExistsSync(project.pomPath))
            .sort((a, b) => a.pomPath.length - b.pomPath.length)
            .forEach(project => {
                items.push({
                    label: project.artifactId,
                    description: project.pomPath,
                    parentProject: project,
                });
            });

        const disposables: Disposable[] = [];
        try {
            return await new Promise<StepResult>((resolve) => {
                const pickBox: QuickPick<ParentPomPickItem> = window.createQuickPick<ParentPomPickItem>();
                pickBox.title = metadata.title;
                pickBox.placeholder = "Select the parent...";
                pickBox.matchOnDescription = true;
                pickBox.ignoreFocusOut = true;
                pickBox.items = items;
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
                    pickBox.onDidAccept(() => {
                        metadata.parentProject = pickBox.selectedItems[0].parentProject;
                        metadata.groupId = metadata.parentProject?.groupId;
                        resolve(StepResult.NEXT);
                    }));
                disposables.push(
                    pickBox.onDidHide(() => {
                        resolve(StepResult.STOP);
                    }));
                disposables.push(pickBox);
                pickBox.show();
            });
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }
}
