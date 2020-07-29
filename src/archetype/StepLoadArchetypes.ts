// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { QuickInputButtons, QuickPick, QuickPickItem, window } from "vscode";
import { getMavenLocalRepository } from "../utils/contextUtils";
import { getPathToExtensionRoot } from "../utils/contextUtils";
import { Utils } from "../utils/Utils";
import { Archetype } from "./Archetype";
import { ArchetypeMetadata, ArchetypeModule, steps } from "./ArchetypeModule";
import { IStep } from "./IStep";

const POPULAR_ARCHETYPES_URL: string = "https://vscodemaventelemetry.blob.core.windows.net/public/popular_archetypes.json";

export class StepLoadArchetypes implements IStep {

    public async execute(archetypeMetadata: ArchetypeMetadata): Promise<IStep | undefined> {
        if (archetypeMetadata.isLoadMore === true || await this.showQuickPickForArchetypes(archetypeMetadata) === null) {
            if (await this.showQuickPickForArchetypes(archetypeMetadata, true) === false) {
                archetypeMetadata.isLoadMore = false;
                return await this.execute(archetypeMetadata);
            }
        }
        if (archetypeMetadata.groupId === undefined || archetypeMetadata.artifactId === undefined) {
            return undefined;
        }
        steps.currentStep += 1;
        return steps.stepSelectVersion;
    }

    private async showQuickPickForArchetypes(archetypeMetadata: ArchetypeMetadata, all?: boolean): Promise<boolean | undefined | null> {
        if (all === undefined) {
            archetypeMetadata.isLoadMore = false;
        } else if (all === true) {
            archetypeMetadata.isLoadMore = true;
        }
        const morePickItem: QuickPickItem & { value: null } = {
            value: null,
            label: "More...",
            description: "",
            detail: "Find more archetypes available in remote catalog."
        };
        return new Promise<boolean | undefined | null>(async (resolve, reject) => {
            const pickBox: QuickPick<QuickPickItem & { value: Archetype | null; }> = window.createQuickPick<QuickPickItem & { value: Archetype | null }>();
            pickBox.placeholder = "Select an archetype ...";
            pickBox.matchOnDescription = true;
            pickBox.items = await this.loadArchetypePickItems(all).then(items => items.map(item => ({
                value: item,
                label: item.artifactId ? `$(package) ${item.artifactId} ` : "More...",
                description: item.groupId ? `${item.groupId}` : "",
                detail: item.description
            }))).then(items => all ? items : [morePickItem, ...items]);
            pickBox.buttons = (all === true) ? [(QuickInputButtons.Back)] : [];
            pickBox.onDidTriggerButton((item) => {
                if (item === QuickInputButtons.Back) {
                    resolve(false);
                    pickBox.dispose();
                }
            });
            pickBox.onDidAccept(() => {
                if (pickBox.selectedItems[0].value === null) {
                    resolve(null);
                } else {
                    archetypeMetadata.groupId = pickBox.selectedItems[0].value.groupId;
                    archetypeMetadata.artifactId = pickBox.selectedItems[0].value.artifactId;
                    archetypeMetadata.versions = pickBox.selectedItems[0].value.versions;
                    resolve(true);
                }
                pickBox.dispose();
            });
            pickBox.onDidHide(() => {
                reject();
                pickBox.dispose();
            });
            pickBox.show();
        });
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
            const rawList: string = await Utils.downloadFile(POPULAR_ARCHETYPES_URL, true);
            fixedList = JSON.parse(rawList);
        } catch (error) {
            console.error(error);
        }
        if (!fixedList) {
            return [];
        } else {
            return <Archetype[]>fixedList.map((fullname: string) => allItems.find((item: Archetype) => fullname === `${item.groupId}:${item.artifactId}`)).filter(Boolean);
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
