// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { Disposable, QuickInputButtons, QuickPick, QuickPickItem, QuickPickItemKind, window } from "vscode";
import { getMavenLocalRepository, getPathToExtensionRoot } from "../../utils/contextUtils";
import { Archetype } from "../Archetype";
import { ArchetypeModule } from "../ArchetypeModule";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

interface IArchetypePickItem extends QuickPickItem {
    archetype?: Archetype;
}

const LABEL_NO_ARCHETYPE = "No Archetype...";
const LABEL_MORE = "More...";

export class SelectArchetypeStep implements IProjectCreationStep {
    /**
     * This has to be the first step, no back buttons provided for previous steps.
     */
    public readonly previousStep: undefined;

    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        const disposables: Disposable[] = [];
        const specifyAchetypePromise = (items: IArchetypePickItem[]) => new Promise<StepResult>((resolve) => {
            const pickBox: QuickPick<IArchetypePickItem> = window.createQuickPick<IArchetypePickItem>();
            pickBox.title = "Create Maven Project";
            pickBox.placeholder = "Select an archetype ...";
            pickBox.matchOnDescription = true;
            pickBox.ignoreFocusOut = true;
            pickBox.items = items;
            disposables.push(
                pickBox.onDidTriggerButton(async (item) => {
                    if (item === QuickInputButtons.Back) {
                        pickBox.items = await this.getArchetypePickItems(false);
                        pickBox.buttons = [];
                    }
                }),
                pickBox.onDidAccept(async () => {
                    if (pickBox.selectedItems[0].archetype === undefined) {
                        if (pickBox.selectedItems[0].label === LABEL_NO_ARCHETYPE) {
                            // Basic project without archetype
                            resolve(StepResult.NEXT);
                        } else if (pickBox.selectedItems[0].label === LABEL_MORE) {
                            // More archetypes...
                            pickBox.items = await this.getArchetypePickItems(true);
                            pickBox.buttons = [QuickInputButtons.Back];
                        } else {
                            // IMPOSSIBLE
                            console.warn(pickBox.selectedItems[0], "unexpected archetype");
                        }
                    } else {
                        metadata.archetypeArtifactId = pickBox.selectedItems[0].archetype.artifactId;
                        metadata.archetypeGroupId = pickBox.selectedItems[0].archetype.groupId;
                        metadata.archetype = pickBox.selectedItems[0].archetype;
                        resolve(StepResult.NEXT);
                    }
                }),
                pickBox.onDidHide(() => {
                    resolve(StepResult.STOP);
                })
            );
            disposables.push(pickBox);
            pickBox.show();
        });

        try {
            const items = await this.getArchetypePickItems(false);
            return await specifyAchetypePromise(items);
        } finally {
            disposables.forEach(d => d.dispose());
        }
    }

    private async getArchetypePickItems(all?: boolean): Promise<IArchetypePickItem[]> {
        const noArchetypeButton: IArchetypePickItem = {
            label: LABEL_NO_ARCHETYPE,
            description: "",
            detail: "Create a basic Maven project directly.",
            alwaysShow: true
        };
        const moreButton: IArchetypePickItem = {
            label: LABEL_MORE,
            description: "",
            detail: "Find more archetypes available in remote catalog.",
            alwaysShow: true
        };
        const archetypes = await this.loadArchetypePickItems(all);
        const pickItems = archetypes.map(archetype => ({
            archetype,
            label: archetype.artifactId ? `$(package) ${archetype.artifactId} ` : "More...",
            description: archetype.groupId ? `${archetype.groupId}` : "",
            detail: archetype.description
        }));
        const SEP_ARCHETYPE: IArchetypePickItem = {
            label: "Popular Archetypes",
            kind: QuickPickItemKind.Separator
        };
        return all ? pickItems : [noArchetypeButton, moreButton, SEP_ARCHETYPE, ...pickItems];
    }

    private async loadArchetypePickItems(all?: boolean): Promise<Archetype[]> {
        // from local catalog
        const localItems: Archetype[] = await this.getLocalArchetypeItems();
        // from cached remote-catalog
        const remoteItems: Archetype[] = await this.getCachedRemoteArchetypeItems();
        const localOnlyItems: Archetype[] = localItems.filter(localItem => !remoteItems.find(remoteItem => remoteItem.identifier === localItem.identifier));
        if (all) {
            return [...localOnlyItems, ...remoteItems];
        } else {
            const recommendedItems: Archetype[] = await this.getRecommendedItems(remoteItems);
            return [...localOnlyItems, ...recommendedItems];
        }
    }

    private async getRecommendedItems(allItems: Archetype[]): Promise<Archetype[]> {
        // Top popular archetypes according to usage data
        let fixedList: string[] | undefined;
        try {
            fixedList = await fse.readJSON(path.join(getPathToExtensionRoot(), "resources", "popular_archetypes.json"));
        } catch (error) {
            console.error(error);
        }
        if (!fixedList) {
            return [];
        } else {
            return fixedList.map((fullname: string) => allItems.find((item: Archetype) => fullname === `${item.groupId}:${item.artifactId}`)).filter(Boolean) as Archetype[];
        }
    }

    private async getLocalArchetypeItems(): Promise<Archetype[]> {
        const localCatalogPath: string = path.join(getMavenLocalRepository(), "archetype-catalog.xml");
        if (await fse.pathExists(localCatalogPath)) {
            const buf: Buffer = await fse.readFile(localCatalogPath);
            return ArchetypeModule.listArchetypeFromXml(buf.toString());
        } else {
            return [];
        }
    }

    private async getCachedRemoteArchetypeItems(): Promise<Archetype[]> {
        const contentPath: string = getPathToExtensionRoot("resources", "archetypes.json");
        if (await fse.pathExists(contentPath)) {
            return (await fse.readJSON(contentPath)).map(
                (rawItem: Archetype) => new Archetype(
                    rawItem.artifactId,
                    rawItem.groupId,
                    rawItem.repository,
                    rawItem.description,
                    rawItem.versions
                )
            );
        } else {
            return [];
        }
    }
}
