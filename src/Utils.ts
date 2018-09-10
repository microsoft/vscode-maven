// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import { commands, ExtensionContext, extensions, Progress, ProgressLocation, RelativePattern, TextDocument, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { setUserError } from "vscode-extension-telemetry-wrapper";
import * as xml2js from "xml2js";
import { MavenExplorerProvider } from "./explorer/MavenExplorerProvider";
import { MavenProjectNode } from "./explorer/model/MavenProjectNode";
import { Settings } from "./Settings";
import { VSCodeUI } from "./VSCodeUI";

interface ICommandHistory {
    pomPath: string;
    timestamps: { [command: string]: number };
}

export namespace Utils {
    let EXTENSION_PUBLISHER: string;
    let EXTENSION_NAME: string;
    let EXTENSION_VERSION: string;
    let EXTENSION_AI_KEY: string;

    export async function loadPackageInfo(context: ExtensionContext): Promise<void> {
        const { publisher, name, version, aiKey } = await fse.readJSON(context.asAbsolutePath("./package.json"));
        EXTENSION_AI_KEY = aiKey;
        EXTENSION_PUBLISHER = publisher;
        EXTENSION_NAME = name;
        EXTENSION_VERSION = version;
    }

    export function getExtensionPublisher(): string {
        return EXTENSION_PUBLISHER;
    }

    export function getExtensionName(): string {
        return EXTENSION_NAME;
    }

    export function getExtensionId(): string {
        return `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
    }

    export function getExtensionVersion(): string {
        return EXTENSION_VERSION;
    }

    export function getAiKey(): string {
        return EXTENSION_AI_KEY;
    }

    export function getTempFolder(): string {
        return path.join(os.tmpdir(), getExtensionId());
    }

    export function getPathToExtensionRoot(...args: string[]): string {
        return path.join(extensions.getExtension(getExtensionId()).extensionPath, ...args);
    }

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

    export function getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "effective-pom.xml");
    }

    export function getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "commandHistory.json");
    }

    export async function readFileIfExists(filepath: string): Promise<string> {
        if (await fse.pathExists(filepath)) {
            return (await fse.readFile(filepath)).toString();
        }
        return null;
    }

    export async function downloadFile(targetUrl: string, readContent?: boolean, customHeaders?: {}): Promise<string> {
        const tempFilePath: string = path.join(getTempFolder(), md5(targetUrl));
        await fse.ensureDir(getTempFolder());
        if (await fse.pathExists(tempFilePath)) {
            await fse.remove(tempFilePath);
        }

        return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
            const urlObj: url.Url = url.parse(targetUrl);
            const options: Object = Object.assign({ headers: Object.assign({}, customHeaders, { 'User-Agent': `vscode/${getExtensionVersion()}` }) }, urlObj);
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
                res.on('data', (chunk: string | Buffer) => {
                    if (readContent) {
                        rawData += chunk;
                    } else {
                        ws.write(chunk);
                    }
                });
                res.on('end', () => {
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
        const mvnString: string = wrappedWithQuotes(formattedPathForTerminal(await getMaven(workspaceFolder)));
        const fullCommand: string = [
            mvnString,
            command.trim(),
            pomfile && `-f "${formattedPathForTerminal(pomfile)}"`,
            Settings.Executable.options(pomfile && Uri.file(pomfile))
        ].filter(Boolean).join(" ");
        const name: string = workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven";
        VSCodeUI.mavenTerminal.runInTerminal(fullCommand, Object.assign({ name }, options));
        if (pomfile) {
            updateLRUCommands(command, pomfile);
        }
    }

    export async function executeInBackground(command: string, pomfile?: string, workspaceFolder?: WorkspaceFolder): Promise<{}> {
        if (!workspaceFolder) {
            workspaceFolder = pomfile && workspace.getWorkspaceFolder(Uri.file(pomfile));
        }
        const mvnExecutable: string = await getMaven(workspaceFolder);
        const mvnString: string = wrappedWithQuotes(mvnExecutable);
        const commandCwd: string = path.resolve(workspaceFolder.uri.fsPath, mvnExecutable, "..");

        const fullCommand: string = [
            mvnString,
            command.trim(),
            pomfile && `-f "${pomfile}"`,
            Settings.Executable.options(pomfile && Uri.file(pomfile))
        ].filter(Boolean).join(" ");

        const customEnv: {} = VSCodeUI.setupEnvironment();
        const execOptions: child_process.ExecOptions = {
            cwd: commandCwd,
            env: Object.assign({}, process.env, customEnv)
        };
        return new Promise<{}>((resolve: (value: {}) => void, reject: (e: Error) => void): void => {
            VSCodeUI.outputChannel.appendLine(fullCommand, "Background Command");
            child_process.exec(fullCommand, execOptions, (error: Error, stdout: string, _stderr: string): void => {
                if (error) {
                    VSCodeUI.outputChannel.appendLine(error);
                    reject(error);
                } else {
                    resolve({ stdout });
                }
            });
        });
    }

    export async function getLRUCommands(pomPath: string): Promise<{}[]> {
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

    export function currentWindowsShell(): string {
        const is32ProcessOn64Windows: boolean = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
        const system32Path: string = `${process.env.windir}\\${is32ProcessOn64Windows ? 'Sysnative' : 'System32'}`;
        const expectedLocations: { [shell: string]: string[] } = {
            'Command Prompt': [`${system32Path}\\cmd.exe`],
            PowerShell: [`${system32Path}\\WindowsPowerShell\\v1.0\\powershell.exe`],
            'WSL Bash': [`${system32Path}\\bash.exe`],
            'Git Bash': [
                `${process.env.ProgramW6432}\\Git\\bin\\bash.exe`,
                `${process.env.ProgramW6432}\\Git\\usr\\bin\\bash.exe`,
                `${process.env.ProgramFiles}\\Git\\bin\\bash.exe`,
                `${process.env.ProgramFiles}\\Git\\usr\\bin\\bash.exe`,
                `${process.env.LocalAppData}\\Programs\\Git\\bin\\bash.exe`
            ]
        };
        const currentWindowsShellPath: string = Settings.External.defaultWindowsShell();
        for (const key in expectedLocations) {
            if (expectedLocations[key].indexOf(currentWindowsShellPath) >= 0) {
                return key;
            }
        }
        return 'Others';
    }

    export function toWSLPath(p: string): string {
        const arr: string[] = p.split(":\\");
        if (arr.length === 2) {
            const drive: string = arr[0].toLowerCase();
            const dir: string = arr[1].replace(/\\/g, "/");
            return `/mnt/${drive}/${dir}`;
        } else {
            return ".";
        }
    }

    export function formattedPathForTerminal(filepath: string): string {
        if (process.platform === "win32") {
            switch (currentWindowsShell()) {
                case "WSL Bash":
                    return toWSLPath(filepath);
                default:
                    return filepath;
            }
        } else {
            return filepath;
        }
    }

    export function getResourcePath(...args: string[]): string {
        return path.join(__filename, "..", "..", "resources", ...args);
    }

    export async function getAllPomPaths(workspaceFolder: WorkspaceFolder): Promise<string[]> {
        const exclusions: string[] = Settings.excludedFolders(workspaceFolder.uri);
        const pomFileUris: Uri[] = await workspace.findFiles(new RelativePattern(workspaceFolder, "**/pom.xml"), `{${exclusions.join(",")}}`);
        return pomFileUris.map(_uri => _uri.fsPath);
    }

    export async function showEffectivePom(pomPath: string): Promise<void> {
        const outputPath: string = Utils.getEffectivePomOutputPath(pomPath);
        await window.withProgress({ location: ProgressLocation.Window }, (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: "Generating effective pom ... " });
                try {
                    await Utils.executeInBackground(`help:effective-pom -Doutput="${outputPath}"`, pomPath);
                    resolve();
                } catch (error) {
                    setUserError(error);
                    reject(error);
                }
            }
        ));
        const pomxml: string = await Utils.readFileIfExists(outputPath);
        fse.remove(outputPath);
        if (pomxml) {
            const document: TextDocument = await workspace.openTextDocument({ language: "xml", content: pomxml });
            window.showTextDocument(document);
        }
    }

    export async function excuteCustomGoal(pomPath: string): Promise<void> {
        if (!pomPath) {
            return;
        }
        const inputGoals: string = await window.showInputBox({ placeHolder: "e.g. clean package -DskipTests", ignoreFocusOut: true });
        const trimedGoals: string = inputGoals && inputGoals.trim();
        if (trimedGoals) {
            Utils.executeInTerminal(trimedGoals, pomPath);
        }
    }

    export async function executeHistoricalGoals(projectPomPaths: string[]): Promise<void> {
        const candidates: any[] = Array.prototype.concat.apply(
            [],
            await Promise.all(projectPomPaths.map(projectPomPath => Utils.getLRUCommands(projectPomPath)))
        );
        candidates.sort((a, b) => b.timestamp - a.timestamp);
        const selected: { command: string, pomPath: string } = await VSCodeUI.getQuickPick(
            candidates,
            (x) => x.command,
            null,
            (x) => x.pomPath,
            { placeHolder: "Select from history ... " }
        );
        if (selected) {
            Utils.executeInTerminal(selected.command, selected.pomPath);
        }
    }

    export async function executeMavenCommand(provider: MavenExplorerProvider): Promise<void> {
        // select a project(pomfile)
        const item: MavenProjectNode = await VSCodeUI.getQuickPick<MavenProjectNode>(
            provider.mavenProjectNodes,
            node => `$(primitive-dot) ${node.mavenProject.name}`,
            null,
            node => node.pomPath,
            { placeHolder: "Select a Maven project." }
        );
        if (!item) {
            return;
        }
        // select a command
        const command: string = await VSCodeUI.getQuickPick<string>(
            ["custom", "clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"],
            (x: string) => x === "custom" ? "Custom goals ..." : x,
            null,
            null,
            { placeHolder: "Select the goal to execute." }
        );
        if (!command) {
            return;
        }
        // execute
        await commands.executeCommand(`maven.goal.${command}`, item);
    }
}
