// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import { Uri, workspace } from "vscode";
import { instrumentOperationStep, sendInfo } from "vscode-extension-telemetry-wrapper";
import { getPathToExtensionRoot } from "../utils/contextUtils";
import { OperationCanceledError } from "../utils/errorUtils";
import { executeInTerminal, getEmbeddedMavenWrapper, getMaven } from "../utils/mavenUtils";
import { openDialogForFolder } from "../utils/uiUtils";
import { Utils } from "../utils/Utils";
import { Archetype } from "./Archetype";
import { finishStep } from "./finishStep";
import { IStep } from "./IStep";
import { loadArchetypesStep } from "./loadArchetypesStep";

const REMOTE_ARCHETYPE_CATALOG_URL: string = "https://repo.maven.apache.org/maven2/archetype-catalog.xml";

export namespace ArchetypeModule {

    async function selectArchetype(): Promise<{ artifactId: string, groupId: string, version: string }> {
        let step: IStep | undefined = loadArchetypesStep;
        const archetypeMetadata: ArchetypeMetadata = {
            groupId: "",
            artifactId: "",
            version: "",
            versions: [],
            isLoadMore: false
        };
        while (step !== finishStep) {
            if (step !== undefined) {
                step = await step.execute(archetypeMetadata);
            } else {
                throw new Error("Unknown generate step.");
            }
        }
        return { artifactId: archetypeMetadata.artifactId, groupId: archetypeMetadata.groupId, version: archetypeMetadata.version };
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

    export async function listArchetypeFromXml(xmlString: string): Promise<Archetype[]> {
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
}

export class ArchetypeMetadata {
    public groupId: string;
    public artifactId: string;
    public versions: string[];
    public version: string;
    public isLoadMore: boolean;
}
