// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { QuickPickItem, window } from "vscode";
import { getMavenLocalRepository, getPathToExtensionRoot } from "../../utils/contextUtils";
import { Utils } from "../../utils/Utils";
import { Archetype } from "../Archetype";
import { ArchetypeModule } from "../ArchetypeModule";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

const POPULAR_ARCHETYPES_URL: string = "https://vscodemaventelemetry.blob.core.windows.net/public/popular_archetypes.json";

interface IArchetypePickItem extends QuickPickItem {
    archetype?: Archetype;
}

export class SelectArchetypeStep implements IProjectCreationStep {
    public async run(metadata: IProjectCreationMetadata): Promise<StepResult> {
        let choice = await window.showQuickPick(this.getArchetypePickItems(false), {
            placeHolder: "Select an archetype ...",
            ignoreFocusOut: true, matchOnDescription: true
        });
        if (choice === undefined) {
            return StepResult.STOP;
        }
        if (choice.archetype === undefined) { // More...
            choice = await window.showQuickPick(this.getArchetypePickItems(true), {
                placeHolder: "Select an archetype ...",
                ignoreFocusOut: true, matchOnDescription: true
            });
        }
        if (choice?.archetype !== undefined) {
            metadata.archetypeArtifactId = choice.archetype.artifactId;
            metadata.archetypeGroupId = choice.archetype.groupId;
            metadata.archetype = choice.archetype; // perserved for archetype version selection.
        }
        return StepResult.NEXT;
    }

    private async getArchetypePickItems(all?: boolean): Promise<IArchetypePickItem[]> {
        const moreButton: IArchetypePickItem = {
            label: "More...",
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
        return all ? pickItems : [moreButton, ...pickItems];
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
