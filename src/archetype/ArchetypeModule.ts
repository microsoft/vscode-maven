/* eslint-disable @typescript-eslint/no-explicit-any */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { Uri, workspace } from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { mavenTerminal } from "../mavenTerminal";
import { Settings } from "../Settings";
import { getPathToExtensionRoot } from "../utils/contextUtils";
import { getEmbeddedMavenWrapper, getMaven } from "../utils/mavenUtils";
import { Utils } from "../utils/Utils";
import { Archetype } from "./Archetype";
import { runSteps, selectArchetypeStep, specifyArchetypeVersionStep, specifyArtifactIdStep, specifyGroupIdStep, specifyTargetFolderStep } from "./createProject";
import { IProjectCreationMetadata, IProjectCreationStep } from "./createProject/types";
import { promptOnDidProjectCreated } from "./utils";

const REMOTE_ARCHETYPE_CATALOG_URL = "https://repo.maven.apache.org/maven2/archetype-catalog.xml";

export class ArchetypeModule {

    public static async createMavenProject(entry: Uri | IProjectCreationMetadata | undefined): Promise<void> {
        const metadata: IProjectCreationMetadata = {
            targetFolderHint: workspace.workspaceFolders?.[0]?.uri.fsPath
        };
        if (entry instanceof Uri) {
            metadata.targetFolderHint = entry.fsPath;
        } else if (typeof entry === 'object') {
            Object.assign(metadata, entry);
        }

        const steps: IProjectCreationStep[] = [];
        if (!metadata.archetypeArtifactId || !metadata.archetypeGroupId || !metadata.archetypeVersion) {
            steps.push(selectArchetypeStep, specifyArchetypeVersionStep);
        }
        if (!metadata.groupId) {
            steps.push(specifyGroupIdStep);
        }
        if (!metadata.artifactId) {
            steps.push(specifyArtifactIdStep);
        }
        if (!metadata.targetFolder) {
            steps.push(specifyTargetFolderStep);
        }

        const success: boolean = await runSteps(steps, metadata);
        if (success) {
            if (metadata.archetypeArtifactId && metadata.archetypeGroupId && metadata.archetypeVersion) {
                await executeInTerminalHandler(metadata);
            } else {
                await createBasicMavenProject(metadata);
            }
        }
    }

    public static async updateArchetypeCatalog(): Promise<void> {
        const xml: string = await Utils.downloadFile(REMOTE_ARCHETYPE_CATALOG_URL, true);
        const archetypes: Archetype[] = await ArchetypeModule.listArchetypeFromXml(xml);
        const targetFilePath: string = path.join(getPathToExtensionRoot(), "resources", "archetypes.json");
        await fse.ensureFile(targetFilePath);
        await fse.writeJSON(targetFilePath, archetypes);
    }

    public static async listArchetypeFromXml(xmlString: string): Promise<Archetype[]> {
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
                const identifier = `${groupId}:${artifactId}`;

                if (dict[identifier] === undefined) {
                    dict[identifier] = new Archetype(artifactId, groupId, repository, description);
                }
                if (dict[identifier].versions.indexOf(version) < 0) {
                    dict[identifier].versions.push(version);
                }
            });
            return Object.keys(dict).map((k: string) => dict[k]);

        } catch (err) {
            console.error(err);
        }
        return [];
    }
}


async function executeInTerminalHandler(metadata: IProjectCreationMetadata): Promise<void> {
    const {
        archetypeArtifactId,
        archetypeGroupId,
        archetypeVersion,
        groupId,
        artifactId,
        targetFolder
    } = metadata;
    if (archetypeArtifactId === undefined || archetypeGroupId === undefined || archetypeVersion === undefined) {
        throw new Error("Archetype information is incomplete.");
    }
    sendInfo("", { archetypeArtifactId, archetypeGroupId, archetypeVersion });
    const cmdArgs: string[] = [
        // explicitly using 3.1.2 as maven-archetype-plugin:3.0.1 ignores -DoutputDirectory
        // see https://github.com/microsoft/vscode-maven/issues/478
        "org.apache.maven.plugins:maven-archetype-plugin:3.1.2:generate",
        `-DarchetypeArtifactId="${archetypeArtifactId}"`,
        `-DarchetypeGroupId="${archetypeGroupId}"`,
        `-DarchetypeVersion="${archetypeVersion}"`,
        `-DgroupId="${groupId}"`,
        `-DartifactId="${artifactId}"`
    ];
    let cwd: string | undefined = targetFolder;
    let mvnPath: string | undefined = await getMaven();
    if (mvnPath === undefined) {
        cmdArgs.push(`-DoutputDirectory="${targetFolder}"`);
        mvnPath = getEmbeddedMavenWrapper();
        cwd = path.dirname(mvnPath);
    }

    if (mvnPath === undefined) { return; }
    const mvnString: string = wrappedWithQuotes(await mavenTerminal.formattedPathForTerminal(mvnPath));

    const defaultArgs: string | undefined = Settings.Executable.options(metadata.targetFolder);
    const mvnSettingsFile: string | undefined = Settings.getSettingsFilePath();
    const mvnSettingsArg: string | undefined = mvnSettingsFile ? `-s "${await mavenTerminal.formattedPathForTerminal(mvnSettingsFile)}"` : undefined;
    let commandLine: string = [mvnString, ...cmdArgs, defaultArgs, mvnSettingsArg].filter(Boolean).join(" ");
    const options: vscode.ShellExecutionOptions = { cwd };
    if (vscode.env.remoteName === undefined && process.platform === "win32") { // VS Code launched in Windows Desktop.
        options.shellQuoting = shellQuotes.cmd;
        options.executable = "cmd.exe";
        options.shellArgs = ["/c"];
        commandLine = `"${commandLine}"`; // wrap full command with quotation marks, cmd /c "<fullcommand>", see https://stackoverflow.com/a/6378038
    } else {
        options.shellQuoting = shellQuotes.bash;
    }
    const execution = new vscode.ShellExecution(commandLine, options);
    const createProjectTask = new vscode.Task({ type: "maven", targetFolder, artifactId }, vscode.TaskScope.Global, "createProject", "maven", execution);
    vscode.tasks.executeTask(createProjectTask);
}

async function createBasicMavenProject(metadata: IProjectCreationMetadata): Promise<void> {
    const {
        groupId,
        artifactId,
        targetFolder
    } = metadata;
    if (!groupId || !artifactId || !targetFolder) {
        return;
    }

    const task = async (p: vscode.Progress<{ message?: string; increment?: number }>) => {
        // copy from template
        p.report({ message: "Generating project from template...", increment: 20 });
        const templateUri = vscode.Uri.file(getPathToExtensionRoot("resources", "projectTemplate"));
        const targetUri = vscode.Uri.joinPath(vscode.Uri.file(targetFolder), artifactId);
        await workspace.fs.copy(templateUri, targetUri, { overwrite: true });

        // update groupId/artifactId in pom.xml
        p.report({ message: "Updating pom.xml file...", increment: 20 });
        const pomUri = vscode.Uri.joinPath(targetUri, "pom.xml");
        let pomContent = (await workspace.fs.readFile(pomUri)).toString();
        pomContent = pomContent.replace("${groupId}", groupId);
        pomContent = pomContent.replace("${artifactId}", artifactId);
        await workspace.fs.writeFile(pomUri, Buffer.from(pomContent));

        // create source files
        p.report({ message: "Creating source files...", increment: 20 });
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(targetUri, "src", "main", "java"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(targetUri, "src", "main", "resources"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(targetUri, "src", "test", "java"));
        const packageUri = vscode.Uri.joinPath(targetUri, "src", "main", "java", ...groupId.split("."));
        await vscode.workspace.fs.createDirectory(packageUri);
        const mainUri = vscode.Uri.joinPath(packageUri, "Main.java");
        const content: string = [
            `package ${groupId};`,
            "",
            "public class Main {",
            "    public static void main(String[] args) {",
            "        System.out.println(\"Hello world!\");",
            "    }",
            "}"
        ].join("\n");
        await vscode.workspace.fs.writeFile(mainUri, Buffer.from(content));

        // TODO: update modules of parent project, on demand
    };

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
    }, task);

    await promptOnDidProjectCreated(artifactId, targetFolder);
}

export class ArchetypeMetadata {
    public groupId: string;
    public artifactId: string;
    public versions: string[];
    public version: string;
    public isLoadMore: boolean;
}

function wrappedWithQuotes(mvn: string): string {
    if (mvn === "mvn") {
        return mvn;
    } else {
        return `"${mvn}"`;
    }
}

// see https://github.com/microsoft/vscode/blob/dddbfa61652de902c75436d250a50c71501da2d7/src/vs/workbench/contrib/tasks/browser/terminalTaskSystem.ts#L140
const shellQuotes: { [key: string]: vscode.ShellQuotingOptions } = {
    cmd: {
        strong: "\""
    },
    powershell: {
        escape: {
            escapeChar: "`",
            charsToEscape: " \"'()"
        },
        strong: "'",
        weak: "\""
    },
    bash: {
        escape: {
            escapeChar: "\\",
            charsToEscape: " \"'"
        },
        strong: "'",
        weak: "\""
    },
    zsh: {
        escape: {
            escapeChar: "\\",
            charsToEscape: " \"'"
        },
        strong: "'",
        weak: "\""
    }
};
