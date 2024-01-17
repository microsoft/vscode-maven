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
import { runSteps, selectArchetypeStep, selectParentPomStep, specifyArchetypeVersionStep, specifyArtifactIdStep, specifyGroupIdStep, specifyTargetFolderStep } from "./createProject";
import { IProjectCreationMetadata, IProjectCreationStep } from "./createProject/types";
import { importProjectOnDemand, promptOnDidProjectCreated } from "./utils";
import { XmlTagName, detectDocumentIndent, getChildrenByTags, getTextFromNode, parseDocument } from "../utils/lexerUtils";

const REMOTE_ARCHETYPE_CATALOG_URL = "https://repo.maven.apache.org/maven2/archetype-catalog.xml";

export class ArchetypeModule {

    public static async createMavenModule(entry: Uri | IProjectCreationMetadata | undefined): Promise<void> {
        const metadata: IProjectCreationMetadata = {
            title: "New Maven Module",
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

        if (!metadata.parentProject) {
            steps.push(selectParentPomStep);
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

        await ArchetypeModule.scaffoldMavenProject(steps, metadata);
    }

    public static async createMavenProject(entry: Uri | IProjectCreationMetadata | undefined): Promise<void> {
        const metadata: IProjectCreationMetadata = {
            title: "New Maven Project",
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

        await ArchetypeModule.scaffoldMavenProject(steps, metadata);
    }

    private static async scaffoldMavenProject(steps: IProjectCreationStep[], metadata: IProjectCreationMetadata): Promise<void> {
        const success: boolean = await runSteps(steps, metadata);
        if (success) {
            if (metadata.archetypeArtifactId && metadata.archetypeGroupId && metadata.archetypeVersion) {
                sendInfo("", {
                    archetypeArtifactId: metadata.archetypeArtifactId, 
                    archetypeGroupId: metadata.archetypeGroupId,
                    archetypeVersion: metadata.archetypeVersion,
                    triggerfrom: metadata.title,
                });
                await executeInTerminalHandler(metadata);
            } else {
                sendInfo("", {
                    archetypeArtifactId: "No Archetype", 
                    triggerfrom: metadata.title,
                });
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
        p.report({ message: "Generating project from template...", increment: 10 });
        const templateUri = vscode.Uri.file(getPathToExtensionRoot("resources", "projectTemplate"));
        const targetUri = vscode.Uri.joinPath(vscode.Uri.file(targetFolder), artifactId);
        await workspace.fs.copy(templateUri, targetUri, { overwrite: true });

        // update groupId/artifactId in pom.xml
        p.report({ message: "Updating pom.xml file...", increment: 10 });
        const pomUri = vscode.Uri.joinPath(targetUri, "pom.xml");
        let pomContent = (await workspace.fs.readFile(pomUri)).toString();
        let parentPom = "";
        let compilerSource = "17";
        let compilerTarget = "17";
        if (metadata.parentProject) {
            parentPom = `    <parent>\n`
                +       `          <groupId>${metadata.parentProject.groupId}</groupId>\n`
                +       `          <artifactId>${metadata.parentProject.artifactId}</artifactId>\n`
                +       `          <version>${metadata.parentProject.version}</version>\n`
                +       `    </parent>\n`;
            compilerSource = metadata.parentProject.getProperty("maven.compiler.source") || "17";
            compilerTarget = metadata.parentProject.getProperty("maven.compiler.target") || "17";
        }
        pomContent = pomContent.replace("${parentPom}", parentPom);
        pomContent = pomContent.replace("${groupId}", groupId);
        pomContent = pomContent.replace("${artifactId}", artifactId);
        pomContent = pomContent.replace("${javaSourceVersion}", compilerSource);
        pomContent = pomContent.replace("${javaTargetVersion}", compilerTarget);
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

        // Update parent pom on demand
        if (metadata.parentProject) {
            p.report({ message: "Update parent pom.xml...", increment: 20 });
            await updateParentPom(metadata.parentProject.pomPath, artifactId);
        }

        // Import the new module as a Java project
        p.report({ message: "Import the new module as Java project...", increment: 20 });
        importProjectOnDemand(targetFolder);
    };

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
    }, task);

    await promptOnDidProjectCreated(artifactId, targetFolder);
}

async function updateParentPom(parentPomPath: string, subModuleName: string): Promise<void> {
    if (!await fse.pathExists(parentPomPath)) {
        return;
    }

    const pomDocument = await workspace.openTextDocument(parentPomPath);
    const documentText = pomDocument.getText();
    const xmlDocument = await parseDocument(documentText);
    if (!xmlDocument) {
        return;
    }

    const projectNodes = getChildrenByTags(xmlDocument, [XmlTagName.Project]);
    if (!projectNodes.length) {
        return;
    }

    const indentInfo = detectDocumentIndent(xmlDocument, documentText) || {
        indent: 2,
        indentChar: " ",
    };
    const basicNodes = getChildrenByTags(projectNodes[0], [XmlTagName.GroupId, XmlTagName.ArtifactId, XmlTagName.Version]);
    let nextInsertOffset = -1;
    basicNodes.forEach(node => {
        if (node.endIndex) {
            if (nextInsertOffset == -1) {
                nextInsertOffset = node.endIndex;
            } else {
                nextInsertOffset = Math.max(nextInsertOffset, node.endIndex);
            }
        }
    });
    nextInsertOffset++;

    const parentPomUri = Uri.file(parentPomPath);
    const packagingNodes = getChildrenByTags(projectNodes[0], [XmlTagName.Packaging]);
    const workspaceEdit = new vscode.WorkspaceEdit();
    // Update the packaging mode to pom.
    if (packagingNodes.length) {
        const node = packagingNodes[0].firstChild;
        if (node && getTextFromNode(node) === "pom") {
            // it's already packaging as pom, do nothing
        } else {
            workspaceEdit.replace(parentPomUri,
                new vscode.Range(
                    pomDocument.positionAt(packagingNodes[0].startIndex ?? 0),
                    pomDocument.positionAt(packagingNodes[0].endIndex ? packagingNodes[0].endIndex + 1 : 0)
                ),
                "<packaging>pom</packaging>");
        }
        nextInsertOffset = packagingNodes[0].endIndex ? packagingNodes[0].endIndex + 1 : nextInsertOffset;
    } else {
        workspaceEdit.insert(parentPomUri,
            pomDocument.positionAt(nextInsertOffset),
            `\n${genIndent(indentInfo.indentChar, indentInfo.indent)}<packaging>pom</packaging>`);
    }

    // Add new module as a child module of parent pom.
    const moduleNodes = getChildrenByTags(projectNodes[0], [XmlTagName.Modules]);
    if (moduleNodes.length) {
        const modules = getChildrenByTags(moduleNodes[0], [XmlTagName.Module]);
        if (modules.length) {
            const lastModule = modules[modules.length - 1];
            nextInsertOffset = lastModule.endIndex ? (lastModule.endIndex || 0) + 1 : nextInsertOffset;
            workspaceEdit.insert(parentPomUri,
                pomDocument.positionAt(nextInsertOffset),
                `\n${genIndent(indentInfo.indentChar, indentInfo.indent * 2)}<module>${subModuleName}</module>`);
        } else {
            workspaceEdit.replace(parentPomUri,
                new vscode.Range(
                    pomDocument.positionAt(moduleNodes[0].startIndex ?? 0),
                    pomDocument.positionAt(moduleNodes[0].endIndex ? moduleNodes[0].endIndex + 1 : 0)
                ),
                `<modules>\n` +
                `${genIndent(indentInfo.indentChar, indentInfo.indent * 2)}<module>${subModuleName}</module>\n` +
                `${genIndent(indentInfo.indentChar, indentInfo.indent)}</modules>`);
        }
    } else {
        workspaceEdit.insert(parentPomUri, pomDocument.positionAt(nextInsertOffset),
            `\n${genIndent(indentInfo.indentChar, indentInfo.indent)}<modules>\n` +
            `${genIndent(indentInfo.indentChar, indentInfo.indent * 2)}<module>${subModuleName}</module>\n` +
            `${genIndent(indentInfo.indentChar, indentInfo.indent)}</modules>`);
    }

    await vscode.workspace.applyEdit(workspaceEdit);
    await pomDocument?.save();
}

function genIndent(indentChar: string, indentSize: number): string {
    let ret = "";
    for (let i = 0; i < indentSize; i++) {
        ret += indentChar;
    }
    return ret;
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
