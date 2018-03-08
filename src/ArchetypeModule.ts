// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import { Uri } from "vscode";
import { Session, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { Archetype } from "./model/Archetype";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";
// tslint:disable-next-line:no-http-string
const REMOTE_ARCHETYPE_CATALOG_URL: string = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";

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
        let cwd: string = null;
        const result: Uri = await VSCodeUI.openDialogForFolder({
            defaultUri: entry && entry.fsPath ? Uri.file(entry.fsPath) : undefined,
            openLabel: "Select Destination Folder"
        });
        if (result && result.fsPath) {
            cwd = result.fsPath;
            finishStep(stepTargetFolder);
            await selectArchetypesSteps(cwd);
        }
    }

    export async function updateArchetypeCatalog(): Promise<void> {
        const xml: string = await Utils.httpGetContent(REMOTE_ARCHETYPE_CATALOG_URL);
        const archetypes: Archetype[] = await Utils.listArchetypeFromXml(xml);
        const targetFilePath: string = path.join(Utils.getPathToExtensionRoot(), "resources", "archetypes.json");
        await fs.ensureFile(targetFilePath);
        await fs.writeJSON(targetFilePath, archetypes);
    }

    async function showQuickPickForArchetypes(options?: { all: boolean }): Promise<Archetype> {
        return await VSCodeUI.getQuickPick<Archetype>(
            loadArchetypePickItems(options),
            (item: Archetype) => item.artifactId ? `$(package) ${item.artifactId} ` : "More ...",
            (item: Archetype) => item.groupId ? `${item.groupId}` : "",
            (item: Archetype) => item.description,
            { matchOnDescription: true, placeHolder: "Select archetype with <groupId>:<artifactId> ..." }
        );
    }

    async function selectArchetypesSteps(cwd: string): Promise<void> {
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
                Utils.getMavenExecutable(),
                "archetype:generate",
                `-DarchetypeArtifactId="${artifactId}"`,
                `-DarchetypeGroupId="${groupId}"`
            ].join(" ");
            VSCodeUI.runInTerminal(cmd, { cwd, name: "Maven-Archetype" });
        }
    }

    async function loadArchetypePickItems(options?: { all: boolean }): Promise<Archetype[]> {
        const contentPath: string = Utils.getPathToExtensionRoot("resources", "archetypes.json");
        if (await fs.pathExists(contentPath)) {
            const allItems: Archetype[] = await fs.readJSON(contentPath);
            if (options && options.all) {
                return allItems;
            } else {
                const preferredGroupIds: string[] = ["com.microsoft", "org.apache.maven.archetypes"];
                const items: Archetype[][] = preferredGroupIds.map((gid: string) => allItems.filter((item: Archetype) => item.groupId.startsWith(gid)));
                return [].concat.apply([new Archetype(null, null, null, "Find more archetypes available in remote catalog.")], items);
            }
        }
        return [];
    }
}
