// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as md5 from "md5";
import * as minimatch from "minimatch";
import * as os from "os";
import * as path from "path";
import * as url from "url";
import { commands, ExtensionContext, extensions, Progress, ProgressLocation, TextDocument, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import * as xml2js from "xml2js";
import { MavenExplorerProvider } from "./explorer/MavenExplorerProvider";
import { MavenProjectNode } from "./explorer/model/MavenProjectNode";
import { Archetype } from "./model/Archetype";
import { IArchetype, IArchetypeCatalogRoot, IArchetypes } from "./model/XmlSchema";
import { VSCodeUI } from "./VSCodeUI";

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

    export function getTempFolderPath(...args: string[]): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, ...args);
    }

    export function getTempFolder(): string {
        return path.join(os.tmpdir(), getExtensionId());
    }

    export function getPathToExtensionRoot(...args: string[]): string {
        return path.join(extensions.getExtension(getExtensionId()).extensionPath, ...args);
    }

    export async function parseXmlFile(filepath: string, options?: xml2js.OptionsV2): Promise<{}> {
        if (await fse.exists(filepath)) {
            const xmlString: string = await fse.readFile(filepath, "utf8");
            return parseXmlContent(xmlString, options);
        } else {
            return null;
        }
    }
    export async function parseXmlContent(xml: string, options?: xml2js.OptionsV2): Promise<{}> {
        const opts: {} = Object.assign({ explicitArray: true }, options);
        return new Promise<{}>(
            (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
                xml2js.parseString(xml, opts, (err: Error, res: {}) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            }
        );
    }

    export function withLRUItemAhead<T>(array: T[], lruItem: T): T[] {
        const ret: T[] = array.filter((elem: T) => elem !== lruItem).reverse();
        ret.push(lruItem);
        return ret.reverse();
    }

    export async function loadCmdHistory(pomXmlFilePath: string): Promise<string[]> {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        if (await fse.pathExists(filepath)) {
            const content: string = (await fse.readFile(filepath)).toString().trim();
            if (content) {
                return content.split("\n").map((line: string) => line.trim()).filter(Boolean);
            }
        }
        return [];
    }

    export async function saveCmdHistory(pomXmlFilePath: string, cmdlist: string[]): Promise<void> {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        await fse.ensureFile(filepath);
        await fse.writeFile(filepath, cmdlist.join("\n"));
    }

    export function getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "effective-pom.xml");
    }

    export function getCommandHistoryCachePath(pomXmlFilePath?: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, pomXmlFilePath ? md5(pomXmlFilePath) : "", "commandHistory.txt");
    }

    export async function readFileIfExists(filepath: string): Promise<string> {
        if (await fse.pathExists(filepath)) {
            return (await fse.readFile(filepath)).toString();
        }
        return null;
    }

    export async function listArchetypeFromXml(xml: string): Promise<Archetype[]> {
        try {
            const catalogRoot: IArchetypeCatalogRoot = await parseXmlContent(xml);
            if (catalogRoot && catalogRoot["archetype-catalog"]) {
                const dict: { [key: string]: Archetype } = {};
                catalogRoot["archetype-catalog"].archetypes.forEach((archetypes: IArchetypes) => {
                    archetypes.archetype.forEach((archetype: IArchetype) => {
                        const groupId: string = archetype.groupId && archetype.groupId.toString();
                        const artifactId: string = archetype.artifactId && archetype.artifactId.toString();
                        const description: string = archetype.description && archetype.description.toString();
                        const version: string = archetype.version && archetype.version.toString();
                        const repository: string = archetype.repository && archetype.repository.toString();
                        const identifier: string = `${groupId}:${artifactId}`;
                        if (!dict[identifier]) {
                            dict[identifier] =
                                new Archetype(artifactId, groupId, repository, description);
                        }
                        if (dict[identifier].versions.indexOf(version) < 0) {
                            dict[identifier].versions.push(version);
                        }
                    });
                });
                return Object.keys(dict).map((k: string) => dict[k]);
            }
        } catch (err) {
            // do nothing
        }
        return [];
    }

    export function getLocalArchetypeCatalogFilePath(): string {
        return path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
    }

    export function getProvidedArchetypeCatalogFilePath(): string {
        return path.join(Utils.getPathToExtensionRoot(), "resources", "archetype-catalog.xml");
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

    async function findAllInDir(currentPath: string, targetFileName: string, depth: number, exclusion?: string[]): Promise<string[]> {
        if (exclusion) {
            for (const pattern of exclusion) {
                if (minimatch(currentPath, pattern)) {
                    return [];
                }
            }
        }
        const ret: string[] = [];
        // `depth < 0` means infinite
        if (depth !== 0 && await fse.pathExists(currentPath)) {
            const stat: fse.Stats = await fse.lstat(currentPath);
            if (stat.isDirectory()) {
                const filenames: string[] = await fse.readdir(currentPath);
                for (const filename of filenames) {
                    const filepath: string = path.join(currentPath, filename);
                    const results: string[] = await findAllInDir(filepath, targetFileName, depth - 1, exclusion);
                    for (const result of results) {
                        ret.push(result);
                    }
                }
            } else if (path.basename(currentPath).toLowerCase() === targetFileName) {
                ret.push(currentPath);
            }
        }
        return ret;
    }

    export function getMavenExecutable(): string {
        const mavenPath: string = workspace.getConfiguration("maven.executable").get<string>("path");
        return mavenPath ? `"${mavenPath}"` : "mvn";
    }

    function getMaven(): string {
        const executablePathInConf: string = workspace.getConfiguration("maven.executable").get<string>("path");
        // TODO: use maven wrapper if path is not set and mvnw is found.
        return executablePathInConf ? executablePathInConf : "mvn";
    }

    function wrapMaven(mvn: string): string {
        if (mvn === "mvn") {
            return mvn;
        } else {
            return `"${mvn}"`;
        }
    }

    export function executeInTerminal(command: string, pomfile: string): void {
        const mvnString: string = wrapMaven(getMaven());
        const fullCommand: string = [
            mvnString,
            command.trim(),
            "-f",
            `"${formattedFilepath(pomfile)}"`,
            workspace.getConfiguration("maven.executable", Uri.file(pomfile)).get<string>("options")
        ].filter((x: string) => x).join(" ");
        const workspaceFolder: WorkspaceFolder = workspace.getWorkspaceFolder(Uri.file(pomfile));
        const name: string = workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven";
        VSCodeUI.runInTerminal(fullCommand, { name });
        updateLRUCommands(command, pomfile);
    }

    export async function executeInBackground(command: string, pomfile: string): Promise<{}> {
        const mvnString: string = wrapMaven(getMaven());

        const fullCommand: string = [
            mvnString,
            command.trim(),
            "-f",
            `"${formattedFilepath(pomfile)}"`,
            workspace.getConfiguration("maven.executable", Uri.file(pomfile)).get<string>("options")
        ].filter((x: string) => x).join(" ");

        const rootfolder: WorkspaceFolder = workspace.getWorkspaceFolder(Uri.file(pomfile));
        const customEnv: {} = VSCodeUI.setupEnvironment();
        const execOptions: child_process.ExecOptions = {
            cwd: rootfolder ? rootfolder.uri.fsPath : path.dirname(pomfile),
            env: Object.assign({}, process.env, customEnv)
        };
        return new Promise<{}>(
            (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
                child_process.exec(fullCommand, execOptions, (error: Error, stdout: string, _stderr: string): void => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve({ stdout });
                    }
                });

            }
        );
    }

    export async function getLRUCommands(pomfile?: string): Promise<{ command: string, pomfile: string }[]> {
        const filepath: string = getCommandHistoryCachePath();
        if (await fse.pathExists(filepath)) {
            const content: string = (await fse.readFile(filepath)).toString().trim();
            if (content) {
                return content.split("\n").map(
                    (line: string) => {
                        const items: string[] = line.split(",");
                        return { command: items[0], pomfile: items[1] };
                    }
                ).filter((item: { command: string, pomfile: string }) => !pomfile || pomfile === item.pomfile);
            }
        }
        return [];
    }

    async function updateLRUCommands(command: string, pomfile: string): Promise<void> {
        const filepath: string = getCommandHistoryCachePath();
        await fse.ensureFile(filepath);
        const content: string = (await fse.readFile(filepath)).toString().trim();
        const lines: string[] = withLRUItemAhead<string>(content.split("\n"), `${command},${pomfile}`);
        const newContent: string = lines.filter(Boolean).slice(0, 20).join("\n");
        await fse.writeFile(filepath, newContent);
    }

    export function currentWindowsShell(): string {
        const is32ProcessOn64Windows: string = process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
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
        const currentWindowsShellPath: string = workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
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

    export function formattedFilepath(filepath: string): string {
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

    export function getMavenVersion(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            const customEnv: {} = VSCodeUI.setupEnvironment();
            const mvnExecutablePath: string = workspace.getConfiguration("maven.executable").get<string>("path") || "mvn";
            let mvnExecutableAbsolutePath: string = mvnExecutablePath;
            if (workspace.workspaceFolders && workspace.workspaceFolders.length) {
                for (const ws of workspace.workspaceFolders) {
                    if (await fse.exists(path.resolve(ws.uri.fsPath, mvnExecutablePath))) {
                        mvnExecutableAbsolutePath = path.resolve(ws.uri.fsPath, mvnExecutablePath);
                        break;
                    }
                }
            }
            const execOptions: child_process.ExecOptions = {
                cwd: mvnExecutableAbsolutePath && path.dirname(mvnExecutableAbsolutePath),
                env: Object.assign({}, process.env, customEnv)
            };
            child_process.exec(
                `${Utils.getMavenExecutable()} --version`, execOptions, (error: Error, _stdout: string, _stderr: string): void => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
        });
    }

    export function getResourcePath(...args: string[]): string {
        return path.join(__filename, "..", "..", "resources", ...args);
    }

    export async function getAllPomPaths(workspaceFolder: WorkspaceFolder): Promise<string[]> {
        const depth: number = workspace.getConfiguration("maven.projects").get<number>("maxDepthOfPom");
        const exclusions: string[] = workspace.getConfiguration("maven.projects", workspaceFolder.uri).get<string[]>("excludedFolders");
        return await findAllInDir(workspaceFolder.uri.fsPath, "pom.xml", depth, exclusions);
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

    export async function executeHistoricalGoals(projectPomPath?: string): Promise<void> {
        const selected: { command: string, pomfile: string } = await VSCodeUI.getQuickPick(
            Utils.getLRUCommands(projectPomPath),
            (x) => x.command,
            null,
            (x) => x.pomfile,
            { placeHolder: "Select from history ... " }
        );
        if (selected) {
            const command: string = selected.command;
            const pomfile: string = selected.pomfile;
            Utils.executeInTerminal(command, pomfile);
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
