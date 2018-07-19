// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import { Uri } from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { Utils } from "../Utils";
import { VSCodeUI } from "../VSCodeUI";
import { Archetype } from "./Archetype";
// tslint:disable-next-line:no-http-string
const REMOTE_ARCHETYPE_CATALOG_URL: string = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";
const POPULAR_ARCHETYPES_URL: string = "https://vscodemaventelemetry.blob.core.windows.net/public/popular_archetypes.json";
class Step {
    public readonly name: string;
    public readonly info: string;
    constructor(name: string, info: string) {
        this.name = name;
        this.info = info;
    }
}

const stepTargetFolder: Step = new Step("TargetFolder", "Target folder selected.");
const stepListMore: Step = new Step("ListMore", "All archetypes listed.");
const stepArchetype: Step = new Step("Archetype", "Archetype selected.");

function finishStep(step: Step): void {
    const session: Session = TelemetryWrapper.currentSession();
    if (session && session.extraProperties) {
        if (!session.extraProperties.finishedSteps) {
            session.extraProperties.finishedSteps = [];
        }
        session.extraProperties.finishedSteps.push(step.name);
    }
    TelemetryWrapper.info(step.info);
}

export namespace ArchetypeModule {
    export async function generateFromArchetype(entry: Uri | undefined): Promise<void> {
        const result: Uri = await VSCodeUI.openDialogForFolder({
            defaultUri: entry && entry.fsPath ? Uri.file(entry.fsPath) : undefined,
            openLabel: "Select Destination Folder"
        });
        const cwd: string = result && result.fsPath;
        if (!cwd) { return; }
        finishStep(stepTargetFolder);

        // selectArchetype
        let selectedArchetype: Archetype = await showQuickPickForArchetypes();
        if (selectedArchetype === undefined) {
            return;
        } else if (!selectedArchetype.artifactId) {
            finishStep(stepListMore);
            selectedArchetype = await showQuickPickForArchetypes({ all: true });
        }

        if (selectedArchetype) {
            const { artifactId, groupId } = selectedArchetype;
            const session: Session = TelemetryWrapper.currentSession();
            if (session && session.extraProperties) {
                session.extraProperties.artifactId = artifactId;
                session.extraProperties.groupId = groupId;
            }
            finishStep(stepArchetype);

            const cmd: string = [
                "archetype:generate",
                `-DarchetypeArtifactId="${artifactId}"`,
                `-DarchetypeGroupId="${groupId}"`
            ].join(" ");
            Utils.executeInTerminal(cmd, null, { cwd });
        }

    }

    export async function updateArchetypeCatalog(): Promise<void> {
        const xml: string = await Utils.downloadFile(REMOTE_ARCHETYPE_CATALOG_URL, true);
        const archetypes: Archetype[] = await listArchetypeFromXml(xml);
        const targetFilePath: string = path.join(Utils.getPathToExtensionRoot(), "resources", "archetypes.json");
        await fse.ensureFile(targetFilePath);
        await fse.writeJSON(targetFilePath, archetypes);
    }

    async function showQuickPickForArchetypes(options?: { all: boolean }): Promise<Archetype> {
        return await VSCodeUI.getQuickPick<Archetype>(
            loadArchetypePickItems(options),
            (item: Archetype) => item.artifactId ? `$(package) ${item.artifactId} ` : "More ...",
            (item: Archetype) => item.groupId ? `${item.groupId}` : "",
            (item: Archetype) => item.description,
            { matchOnDescription: true, placeHolder: "Select an archetype ..." }
        );
    }

    async function loadArchetypePickItems(options?: { all: boolean }): Promise<Archetype[]> {
        // from local catalog
        const localItems: Archetype[] = await getLocalArchetypeItems();
        // from cached remote-catalog
        const remoteItems: Archetype[] = await getCachedRemoteArchetypeItems();
        const localOnlyItems: Archetype[] = localItems.filter(localItem => !remoteItems.find(remoteItem => remoteItem.identifier === localItem.identifier));
        if (options && options.all) {
            return [].concat(localOnlyItems, remoteItems);
        } else {
            const recommendedItems: Archetype[] = await getRecomendedItems(remoteItems);
            return [new Archetype(null, null, null, "Find more archetypes available in remote catalog.")].concat(localOnlyItems, recommendedItems);
        }
    }

    async function getRecomendedItems(allItems: Archetype[]): Promise<Archetype[]> {
        // Top popular archetypes according to usage data
        let fixedList: string[];
        try {
            const rawlist: string = await Utils.downloadFile(POPULAR_ARCHETYPES_URL, true);
            fixedList = JSON.parse(rawlist);
        } catch (error) {
            fixedList = [];
        }
        return fixedList.map((fullname: string) => allItems.find((item: Archetype) => fullname === `${item.groupId}:${item.artifactId}`));
    }

    async function listArchetypeFromXml(xmlString: string): Promise<Archetype[]> {
        try {
            const xmlObject: any = await Utils.parseXmlContent(xmlString);
            const catalog: any = xmlObject && xmlObject["archetype-catalog"];
            const dict: { [key: string]: Archetype } = {};
            const archetypeList: any[] = catalog.archetypes[0].archetype;
            archetypeList.forEach(archetype => {
                const groupId: string = archetype.groupId && archetype.groupId[0];
                const artifactId: string = archetype.artifactId && archetype.artifactId[0];
                const description: string = archetype.description && archetype.description[0];
                const version: string = archetype.version && archetype.version[0];
                const repository: string = archetype.repository && archetype.repository[0];
                const identifier: string = `${groupId}:${artifactId}`;

                if (!dict[identifier]) {
                    dict[identifier] = new Archetype(artifactId, groupId, repository, description);
                }
                if (dict[identifier].versions.indexOf(version) < 0) {
                    dict[identifier].versions.push(version);
                }
            });
            return Object.keys(dict).map((k: string) => dict[k]);

        } catch (err) {
            // do nothing
        }
        return [];
    }

    async function getLocalArchetypeItems(): Promise<Archetype[]> {
        const localCatalogPath: string = path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
        if (await fse.pathExists(localCatalogPath)) {
            const buf: Buffer = await fse.readFile(localCatalogPath);
            return listArchetypeFromXml(buf.toString());
        } else {
            return [];
        }
    }

    async function getCachedRemoteArchetypeItems(): Promise<Archetype[]> {
        const contentPath: string = Utils.getPathToExtensionRoot("resources", "archetypes.json");
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
