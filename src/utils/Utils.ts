// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as md5 from "md5";
import * as path from "path";
import * as url from "url";
import { commands, Progress, ProgressLocation, RelativePattern, TextDocument, Uri, ViewColumn, window, workspace, WorkspaceFolder } from "vscode";
import { createUuid, setUserError } from "vscode-extension-telemetry-wrapper";
import * as xml2js from "xml2js";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { mavenOutputChannel } from "../mavenOutputChannel";
import { mavenTerminal } from "../mavenTerminal";
import { Settings } from "../Settings";
import { getExtensionName, getExtensionVersion, getPathToTempFolder } from "./contextUtils";

interface ICommandHistory {
    pomPath: string;
    timestamps: { [command: string]: number };
}

interface ICommandHistoryEntry {
    command: string;
    pomPath: string;
    timestamp: number;
}

export namespace Utils {

    export async function parseXmlFile(xmlFilePath: string, options?: xml2js.OptionsV2): Promise<{}> {
        if (await fse.pathExists(xmlFilePath)) {
            const xmlString: string = await fse.readFile(xmlFilePath, "utf8");
            return parseXmlContent(xmlString, options);
        } else {
            return null;
        }
    }

    export async function parseXmlContent(xmlString: string, options?: xml2js.OptionsV2): Promise<{}> {
        const opts: {} = Object.assign({ explicitArray: true }, options);
        return new Promise<{}>(
            (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
                xml2js.parseString(xmlString, opts, (err: Error, res: {}) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            }
        );
    }

    function getTempOutputPath(key: string): string {
        return getPathToTempFolder(getExtensionName(), md5(key), createUuid());
    }

    function getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return getPathToTempFolder(getExtensionName(), md5(pomXmlFilePath), "commandHistory.json");
    }

    export async function readFileIfExists(filepath: string): Promise<string> {
        if (await fse.pathExists(filepath)) {
            return (await fse.readFile(filepath)).toString();
        }
        return null;
    }

    export async function downloadFile(targetUrl: string, readContent?: boolean, customHeaders?: {}): Promise<string> {
        const tempFilePath: string = getTempOutputPath(targetUrl);
        await fse.ensureFile(tempFilePath);

        return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
            const urlObj: url.Url = url.parse(targetUrl);
            const options: Object = Object.assign({ headers: Object.assign({}, customHeaders, { "User-Agent": `vscode/${getExtensionVersion()}` }) }, urlObj);
            let client: any;
            if (urlObj.protocol === "https:") {
                client = https;
                // tslint:disable-next-line:no-http-string
            } else if (urlObj.protocol === "http:") {
                client = http;
            } else {
                return reject(new Error("Unsupported protocol."));
            }
            client.get(options, (res: http.IncomingMessage) => {
                let rawData: string;
                let ws: fse.WriteStream;
                if (readContent) {
                    rawData = "";
                } else {
                    ws = fse.createWriteStream(tempFilePath);
                }
                res.on("data", (chunk: string | Buffer) => {
                    if (readContent) {
                        rawData += chunk;
                    } else {
                        ws.write(chunk);
                    }
                });
                res.on("end", () => {
                    if (readContent) {
                        resolve(rawData);
                    } else {
                        ws.end();
                        resolve(tempFilePath);
                    }
                });
            }).on("error", (err: Error) => {
                reject(err);
            });
        });
    }

    async function getMaven(workspaceFolder?: WorkspaceFolder): Promise<string> {
        if (!workspaceFolder) {
            return Settings.Executable.path(null) || "mvn";
        }
        const executablePathInConf: string = Settings.Executable.path(workspaceFolder.uri);
        const preferMavenWrapper: boolean = Settings.Executable.preferMavenWrapper(workspaceFolder.uri);
        if (!executablePathInConf) {
            const mvnwPathWithoutExt: string = path.join(workspaceFolder.uri.fsPath, "mvnw");
            if (preferMavenWrapper && await fse.pathExists(mvnwPathWithoutExt)) {
                return mvnwPathWithoutExt;
            } else {
                return "mvn";
            }
        } else {
            return path.resolve(workspaceFolder.uri.fsPath, executablePathInConf);
        }
    }

    function wrappedWithQuotes(mvn: string): string {
        if (mvn === "mvn") {
            return mvn;
        } else {
            return `"${mvn}"`;
        }
    }

    export async function executeInTerminal(command: string, pomfile?: string, options?: {}): Promise<void> {
        const workspaceFolder: WorkspaceFolder = pomfile && workspace.getWorkspaceFolder(Uri.file(pomfile));
        const mvnString: string = wrappedWithQuotes(await mavenTerminal.formattedPathForTerminal(await getMaven(workspaceFolder)));
        const fullCommand: string = [
            mvnString,
            command.trim(),
            pomfile && `-f "${await mavenTerminal.formattedPathForTerminal(pomfile)}"`,
            Settings.Executable.options(pomfile && Uri.file(pomfile))
        ].filter(Boolean).join(" ");
        const name: string = workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven";
        await mavenTerminal.runInTerminal(fullCommand, Object.assign({ name }, options));
        if (pomfile) {
            updateLRUCommands(command, pomfile);
        }
    }

    export async function executeInBackground(command: string, pomfile?: string, workspaceFolder?: WorkspaceFolder): Promise<any> {
        if (!workspaceFolder) {
            workspaceFolder = pomfile && workspace.getWorkspaceFolder(Uri.file(pomfile));
        }
        const mvnExecutable: string = await getMaven(workspaceFolder);
        const mvnString: string = wrappedWithQuotes(mvnExecutable);
        // Todo with following line:
        // 1. pomfile and workspacefolder = undefined, error
        // 2. non-readable
        const commandCwd: string = path.resolve(workspaceFolder.uri.fsPath, mvnExecutable, "..");

        const fullCommand: string = [
            mvnString,
            command.trim(),
            pomfile && `-f "${pomfile}"`,
            Settings.Executable.options(pomfile && Uri.file(pomfile))
        ].filter(Boolean).join(" ");

        const customEnv: {} = getEnvironment();
        const execOptions: child_process.ExecOptions = {
            cwd: commandCwd,
            env: Object.assign({}, process.env, customEnv)
        };
        return new Promise<{}>((resolve: (value: any) => void, reject: (e: Error) => void): void => {
            mavenOutputChannel.appendLine(fullCommand, "Background Command");
            child_process.exec(fullCommand, execOptions, (error: Error, stdout: string, _stderr: string): void => {
                if (error) {
                    mavenOutputChannel.appendLine(error);
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    export function getEnvironment(): {} {
        const customEnv: any = getJavaHomeEnvIfAvailable();
        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        };
        const environmentSettings: EnvironmentSetting[] = Settings.Terminal.customEnv();
        environmentSettings.forEach((s: EnvironmentSetting) => {
            customEnv[s.environmentVariable] = s.value;
        });
        return customEnv;
    }

    function getJavaHomeEnvIfAvailable(): {} {
        // Look for the java.home setting from the redhat.java extension.  We can reuse it
        // if it exists to avoid making the user configure it in two places.
        const javaHome: string = Settings.External.javaHome();
        const useJavaHome: boolean = Settings.Terminal.useJavaHome();
        if (useJavaHome && javaHome) {
            return { JAVA_HOME: javaHome };
        } else {
            return {};
        }
    }

    export async function getLRUCommands(pomPath: string): Promise<ICommandHistoryEntry[]> {
        const filepath: string = getCommandHistoryCachePath(pomPath);
        if (await fse.pathExists(filepath)) {
            const content: string = (await fse.readFile(filepath)).toString();
            let historyObject: ICommandHistory;
            try {
                historyObject = JSON.parse(content);
            } catch (error) {
                historyObject = { pomPath, timestamps: {} };
            }
            const timestamps: { [command: string]: number } = historyObject.timestamps;
            const commandList: string[] = Object.keys(timestamps).sort((a, b) => timestamps[b] - timestamps[a]);
            return commandList.map(command => Object.assign({ command, pomPath, timestamp: timestamps[command] }));
        }
        return [];
    }

    async function updateLRUCommands(command: string, pomPath: string): Promise<void> {
        const historyFilePath: string = getCommandHistoryCachePath(pomPath);
        await fse.ensureFile(historyFilePath);
        const content: string = (await fse.readFile(historyFilePath)).toString();
        let historyObject: ICommandHistory;
        try {
            historyObject = JSON.parse(content);
            historyObject.pomPath = pomPath;
        } catch (error) {
            historyObject = { pomPath, timestamps: {} };
        } finally {
            historyObject.timestamps[command] = Date.now();
        }
        await fse.writeFile(historyFilePath, JSON.stringify(historyObject));
    }

    export async function getAllPomPaths(workspaceFolder: WorkspaceFolder): Promise<string[]> {
        const exclusions: string[] = Settings.excludedFolders(workspaceFolder.uri);
        const pomFileUris: Uri[] = await workspace.findFiles(new RelativePattern(workspaceFolder, "**/pom.xml"), `{${exclusions.join(",")}}`);
        return pomFileUris.map(_uri => _uri.fsPath);
    }

    export async function showEffectivePom(pomPath: string): Promise<void> {
        let pomxml: string;
        const project: MavenProject = mavenExplorerProvider.getMavenProject(pomPath);
        if (project) {
            await project.calculateEffectivePom();
            pomxml = project.rawEffectivePom;
        } else {
            pomxml = await Utils.getEffectivePom(pomPath);
        }

        if (pomxml) {
            const document: TextDocument = await workspace.openTextDocument({ language: "xml", content: pomxml });
            window.showTextDocument(document, ViewColumn.Active);
        }
    }

    export async function getEffectivePom(pomPathOrMavenProject: string | MavenProject): Promise<string> {
        let pomPath: string;
        let name: string;
        if (typeof pomPathOrMavenProject === "object" && pomPathOrMavenProject instanceof MavenProject) {
            const mavenProject: MavenProject = <MavenProject>pomPathOrMavenProject;
            pomPath = mavenProject.pomPath;
            name = mavenProject.name;
        } else if (typeof pomPathOrMavenProject === "string") {
            pomPath = pomPathOrMavenProject;
            name = pomPath;
        } else {
            return undefined;
        }
        return await window.withProgress({ location: ProgressLocation.Window }, (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: `Generating Effective POM: ${name}` });
                try {
                    const outputPath: string = getTempOutputPath(pomPath);
                    await Utils.executeInBackground(`help:effective-pom -Doutput="${outputPath}"`, pomPath);
                    const pomxml: string = await Utils.readFileIfExists(outputPath);
                    await fse.remove(outputPath);
                    return resolve(pomxml);
                } catch (error) {
                    setUserError(error);
                    return reject(error);
                }
            }
        ));
    }

    export async function getPluginDescription(pluginId: string, pomPath: string): Promise<string> {
        return await window.withProgress({ location: ProgressLocation.Window }, (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: `Retrieving Plugin Info: ${pluginId}` });
                const outputPath: string = getTempOutputPath(pluginId);
                try {
                    // For MacOSX, add "-Dapple.awt.UIElement=true" to prevent showing icons in dock
                    await Utils.executeInBackground(`help:describe -Dapple.awt.UIElement=true -Dplugin=${pluginId} -Doutput="${outputPath}"`, pomPath);
                    const content: string = await Utils.readFileIfExists(outputPath);
                    await fse.remove(outputPath);
                    return resolve(content);
                } catch (error) {
                    setUserError(error);
                    return reject(error);
                }
            }
        ));
    }

    export async function executeCustomGoal(pomPath: string): Promise<void> {
        if (!pomPath) {
            return;
        }
        const inputGoals: string = await window.showInputBox({ placeHolder: "e.g. clean package -DskipTests", ignoreFocusOut: true });
        const trimmedGoals: string = inputGoals && inputGoals.trim();
        if (trimmedGoals) {
            Utils.executeInTerminal(trimmedGoals, pomPath);
        }
    }

    export async function executeHistoricalGoals(projectPomPaths: string[]): Promise<void> {
        const candidates: ICommandHistoryEntry[] = Array.prototype.concat.apply(
            [],
            await Promise.all(projectPomPaths.map(projectPomPath => Utils.getLRUCommands(projectPomPath)))
        );
        candidates.sort((a, b) => b.timestamp - a.timestamp);
        const selected: { command: string; pomPath: string; timestamp: number } = await window.showQuickPick(
            candidates.map(item => ({
                value: item,
                label: item.command,
                description: undefined,
                detail: item.pomPath
            })),
            { placeHolder: "Select from history ...", ignoreFocusOut: true }
        ).then(item => item && item.value);
        if (selected) {
            Utils.executeInTerminal(selected.command, selected.pomPath);
        }
    }

    export async function executeMavenCommand(): Promise<void> {
        // select a project(pomfile)
        const selectedProject: MavenProject = await window.showQuickPick(
            mavenExplorerProvider.mavenProjectNodes.map(item => ({
                value: item,
                label: `$(primitive-dot) ${item.name}`,
                description: undefined,
                detail: item.pomPath
            })),
            { placeHolder: "Select a Maven project ...", ignoreFocusOut: true }
        ).then(item => item && item.value);
        if (!selectedProject) {
            return;
        }

        // select a command
        const selectedCommand: string = await window.showQuickPick(
            ["custom", "clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].map(item => ({
                value: item,
                label: item,
                description: undefined
            })),
            { placeHolder: "Select the goal to execute ...", ignoreFocusOut: true }
        ).then(item => item && item.value);
        if (!selectedCommand) {
            return;
        }

        // execute
        await commands.executeCommand(`maven.goal.${selectedCommand}`, selectedProject);
    }
}
