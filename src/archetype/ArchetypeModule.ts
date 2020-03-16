// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { QuickPickItem, Uri, window, workspace } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { OperationCanceledError } from "../Errors";
import { getMavenLocalRepository, getPathToExtensionRoot } from "../utils/contextUtils";
import { executeInTerminal, getEmbeddedMavenWrapper, getMaven } from "../utils/mavenUtils";
import { openDialogForFolder } from "../utils/uiUtils";
import { Utils } from "../utils/Utils";
import { Archetype } from "./Archetype";

const REMOTE_ARCHETYPE_CATALOG_URL: string = "https://repo.maven.apache.org/maven2/archetype-catalog.xml";
const POPULAR_ARCHETYPES_URL: string = "https://vscodemaventelemetry.blob.core.windows.net/public/popular_archetypes.json";

export namespace ArchetypeModule {
    async function selectArchetype(): Promise<{ artifactId: string, groupId: string, version: string }> {
        let selectedArchetype: Archetype | undefined | null = await showQuickPickForArchetypes();
        while (selectedArchetype === null) {
            selectedArchetype = await showQuickPickForArchetypes(true);
        }
        if (selectedArchetype === undefined) {
            throw new OperationCanceledError("Archetype not selected.");
        }
        const version: string | undefined = await window.showQuickPick(selectedArchetype.versions, {
            placeHolder: "Select a version ..."
        });
        if (version === undefined) {
            throw new OperationCanceledError("Archetype version not selected.");
        }
        const { artifactId, groupId } = selectedArchetype;
        return { artifactId, groupId, version };
    }

    async function chooseTargetFolder(entry: Uri | undefined): Promise<string> {
        const result: Uri | undefined = await openDialogForFolder({
            defaultUri: entry,
            openLabel: "Select Destination Folder"
        });
        const cwd: string | undefined = result !== undefined ? result.fsPath : undefined;
        if (!cwd) {
            throw new OperationCanceledError("Target folder not selected.");
        }
        return cwd;
    }

    async function executeInTerminalHandler(archetypeGroupId: string, archetypeArtifactId: string, archetypeVersion: string, targetFolder: string): Promise<void> {
        const cmdArgs: string[] = [
            // explicitly using 3.1.2 as maven-archetype-plugin:3.0.1 ignores -DoutputDirectory
            // see https://github.com/microsoft/vscode-maven/issues/478
            "org.apache.maven.plugins:maven-archetype-plugin:3.1.2:generate",
            `-DarchetypeArtifactId="${archetypeArtifactId}"`,
            `-DarchetypeGroupId="${archetypeGroupId}"`,
            `-DarchetypeVersion="${archetypeVersion}"`
        ];
        let mvnPath: string | undefined;
        let cwd: string = targetFolder;
        if (!await getMaven()) {
            cmdArgs.push(`-DoutputDirectory="${targetFolder}"`);
            mvnPath = getEmbeddedMavenWrapper();
            cwd = path.dirname(mvnPath);
        }
        await executeInTerminal({ mvnPath, command: cmdArgs.join(" "), pomfile: undefined, terminalName: "Maven archetype", cwd });
    }

    export async function generateFromArchetype(entry: Uri | undefined, operationId: string): Promise<void> {
        try {
            // select archetype.
            const { artifactId, groupId, version } = await instrumentOperationStep(operationId, "selectArchetype", selectArchetype)();
            sendInfo(operationId, { archetypeArtifactId: artifactId, archetypeGroupId: groupId, archetypeVersion: version });

            // choose target folder.
            let targetFolderHint: Uri | undefined;
            if (entry) {
                targetFolderHint = entry;
            } else if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
                targetFolderHint = workspace.workspaceFolders[0].uri;
            }
            const cwd: string = await instrumentOperationStep(operationId, "chooseTargetFolder", chooseTargetFolder)(targetFolderHint);

            // execute in terminal.
            await instrumentOperationStep(operationId, "executeInTerminal", executeInTerminalHandler)(groupId, artifactId, version, cwd);
        } catch (error) {
            if (error instanceof OperationCanceledError) {
                // swallow
            } else {
                throw error;
            }
        }
    }

    export async function updateArchetypeCatalog(): Promise<void> {
        const xml: string = await Utils.downloadFile(REMOTE_ARCHETYPE_CATALOG_URL, true);
        const archetypes: Archetype[] = await listArchetypeFromXml(xml);
        const targetFilePath: string = path.join(getPathToExtensionRoot(), "resources", "archetypes.json");
        await fse.ensureFile(targetFilePath);
        await fse.writeJSON(targetFilePath, archetypes);
    }

    async function showQuickPickForArchetypes(all?: boolean): Promise<Archetype | undefined | null> {
        const morePickItem: QuickPickItem & { value: null } = {
            value: null,
            label: "More...",
            description: "",
            detail: "Find more archetypes available in remote catalog."
        };
        return await window.showQuickPick<QuickPickItem & { value: Archetype | null }>(
            loadArchetypePickItems(all).then(items => items.map(item => ({
                value: item,
                label: item.artifactId ? `$(package) ${item.artifactId} ` : "More...",
                description: item.groupId ? `${item.groupId}` : "",
                detail: item.description
            }))).then(items => all ? items : [morePickItem, ...items]),
            { matchOnDescription: true, placeHolder: "Select an archetype ..." }
        ).then(selected => selected ? selected.value : undefined);
    }

    async function loadArchetypePickItems(all?: boolean): Promise<Archetype[]> {
        // from local catalog
        const localItems: Archetype[] = await getLocalArchetypeItems();
        // from cached remote-catalog
        const remoteItems: Archetype[] = await getCachedRemoteArchetypeItems();
        const localOnlyItems: Archetype[] = localItems.filter(localItem => !remoteItems.find(remoteItem => remoteItem.identifier === localItem.identifier));
        if (all) {
            return [...localOnlyItems, ...remoteItems];
        } else {
            const recommendedItems: Archetype[] = await getRecommendedItems(remoteItems);
            return [...localOnlyItems, ...recommendedItems];
        }
    }

    async function getRecommendedItems(allItems: Archetype[]): Promise<Archetype[]> {
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
        const localCatalogPath: string = path.join(getMavenLocalRepository(), "archetype-catalog.xml");
        if (await fse.pathExists(localCatalogPath)) {
            const buf: Buffer = await fse.readFile(localCatalogPath);
            return listArchetypeFromXml(buf.toString());
        } else {
            return [];
        }
    }

    async function getCachedRemoteArchetypeItems(): Promise<Archetype[]> {
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
