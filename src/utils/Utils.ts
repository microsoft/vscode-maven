// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as md5 from "md5";
import * as path from "path";
import * as url from "url";
import { commands, Progress, ProgressLocation, RelativePattern, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { createUuid, setUserError } from "vscode-extension-telemetry-wrapper";
import * as xml2js from "xml2js";
import { DEFAULT_MAVEN_LIFECYCLES } from "../completion/constants";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { LifecyclePhase } from "../explorer/model/LifecyclePhase";
import { MavenProject } from "../explorer/model/MavenProject";
import { Settings } from "../Settings";
import { getExtensionVersion, getPathToTempFolder, getPathToWorkspaceStorage } from "./contextUtils";
import { MavenNotFoundError } from "./errorUtils";
import { getLRUCommands, ICommandHistoryEntry } from "./historyUtils";
import { executeInTerminal, getMaven, pluginDescription, rawEffectivePom } from "./mavenUtils";
import { effectivePomContentUri, selectProjectIfNecessary } from "./uiUtils";

export namespace Utils {

    export async function parseXmlFile(xmlFilePath: string, options?: xml2js.OptionsV2): Promise<{} | undefined> {
        if (await fse.pathExists(xmlFilePath)) {
            const xmlString: string = await fse.readFile(xmlFilePath, "utf8");
            return parseXmlContent(xmlString, options);
        } else {
            return undefined;
        }
    }

    export async function parseXmlContent(xmlString: string, options?: xml2js.OptionsV2): Promise<{}> {
        const opts: {} = Object.assign({ explicitArray: true }, options);
        return new Promise<{}>(
            (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
                xml2js.parseString(xmlString, opts, (err: Error, res: {}) => {
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            }
        );
    }

    function getTempOutputPath(key: string): string {
        const pathInWorkspaceFolder: string | undefined = getPathToWorkspaceStorage(md5(key), createUuid());
        if (pathInWorkspaceFolder !== undefined) {
            return pathInWorkspaceFolder;
        } else {
            return getPathToTempFolder(md5(key), createUuid());
        }
    }

    export async function downloadFile(targetUrl: string, readContent?: boolean, customHeaders?: {}): Promise<string> {
        const tempFilePath: string = getTempOutputPath(targetUrl);
        await fse.ensureFile(tempFilePath);

        return await new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
            const urlObj: url.Url = url.parse(targetUrl);
            const options: object = Object.assign({ headers: Object.assign({}, customHeaders, { "User-Agent": `vscode/${getExtensionVersion()}` }) }, urlObj);
            let client: any;
            if (urlObj.protocol === "https:") {
                client = https;
                // tslint:disable-next-line:no-http-string
            } else if (urlObj.protocol === "http:") {
                client = http;
            } else {
                reject(new Error("Unsupported protocol."));
                return;
            }
            // tslint:disable-next-line: no-unsafe-any
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

    export async function getAllPomPaths(workspaceFolder?: WorkspaceFolder): Promise<string[]> {
        if (!workspaceFolder) {
            if (workspace.workspaceFolders) {
                const arrayOfPoms: string[][] = await Promise.all(workspace.workspaceFolders.map(getAllPomPaths));
                return [].concat.apply([], arrayOfPoms);
            } else {
                return [];
            }
        }
        const exclusions: string[] = Settings.excludedFolders(workspaceFolder.uri);
        const pattern: string = Settings.Pomfile.globPattern();
        const pomFileUris: Uri[] = await workspace.findFiles(new RelativePattern(workspaceFolder, pattern), `{${exclusions.join(",")}}`);
        return pomFileUris.map(_uri => _uri.fsPath);
    }

    export async function showEffectivePom(param: Uri | MavenProject | string): Promise<void> {
        let pomPath: string | undefined;
        if (typeof param === "string") {
            pomPath = param;
        } else if (typeof param === "object" && param instanceof MavenProject) {
            pomPath = param.pomPath;
        } else if (typeof param === "object" && param instanceof Uri) {
            pomPath = param.fsPath;
        }
        if (!pomPath) {
            throw new Error("Corresponding pom.xml file not found.");
        }

        const mvn: string | undefined = await getMaven(pomPath);
        if (mvn === undefined) {
            throw new MavenNotFoundError();
        }

        const uri = effectivePomContentUri(pomPath);
        await window.showTextDocument(uri);
    }

    export async function getEffectivePom(pomPathOrMavenProject: string | MavenProject): Promise<string | undefined> {
        let pomPath: string;
        let name: string;
        if (typeof pomPathOrMavenProject === "object" && pomPathOrMavenProject instanceof MavenProject) {
            const mavenProject: MavenProject = pomPathOrMavenProject;
            pomPath = mavenProject.pomPath;
            name = mavenProject.name;
        } else if (typeof pomPathOrMavenProject === "string") {
            pomPath = pomPathOrMavenProject;
            name = pomPath;
        } else {
            return undefined;
        }
        return await window.withProgress({ location: ProgressLocation.Notification }, async (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: `Generating Effective POM: ${name}` });
                try {
                    const ret: string | undefined = await rawEffectivePom(pomPath);
                    resolve(ret ? ret : "");
                } catch (error) {
                    setUserError(error);
                    reject(error);
                }
            }
        ));
    }

    export async function getPluginDescription(pluginId: string, pomPath: string): Promise<string> {
        return await window.withProgress({ location: ProgressLocation.Window }, async (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: `Retrieving Plugin Info: ${pluginId}` });
                try {
                    const ret: string | undefined = await pluginDescription(pluginId, pomPath);
                    resolve(ret ? ret : "");
                } catch (error) {
                    setUserError(error);
                    reject(error);
                }
            }
        ));
    }

    export async function executeCustomGoal(pomOrProject: string | MavenProject): Promise<void> {
        let pomPath: string | undefined;
        if (typeof pomOrProject === "string") {
            pomPath = pomOrProject;
        } else if (typeof pomOrProject === "object" && pomOrProject instanceof MavenProject) {
            pomPath = pomOrProject.pomPath;
        }

        if (!pomPath) {
            return;
        }
        const inputGoals: string | undefined = await window.showInputBox({ placeHolder: "e.g. clean package -DskipTests", ignoreFocusOut: true });
        const trimmedGoals: string | undefined = inputGoals ? inputGoals.trim() : undefined;
        if (trimmedGoals) {
            await executeInTerminal({ command: trimmedGoals, pomfile: pomPath });
        }
    }

    export async function executeHistoricalGoals(projectPomPaths: string[]): Promise<void> {
        const candidates: ICommandHistoryEntry[] = Array.prototype.concat.apply(
            [],
            await Promise.all(projectPomPaths.map(getLRUCommands))
        ) as ICommandHistoryEntry[];
        candidates.sort((a, b) => b.timestamp - a.timestamp);
        const selected: { command: string; pomPath: string; timestamp: number } | undefined = await window.showQuickPick(
            candidates.map(item => ({
                value: item,
                label: item.command,
                description: undefined,
                detail: item.pomPath
            })),
            { placeHolder: "Select from history ...", ignoreFocusOut: true }
        ).then(item => item ? item.value : undefined);
        if (selected) {
            await executeInTerminal({ command: selected.command, pomfile: selected.pomPath });
        }
    }

    export async function executeMavenCommand(node?: any): Promise<void> {
        let selectedProject: MavenProject | undefined;
        let selectedCommand: string | undefined;
        if (node instanceof LifecyclePhase) {
            selectedProject = node.project;
            selectedCommand = node.phase;
        } else if (node && node.uri) {
            // for nodes from Project Manager
            const pomPath: string = path.join(Uri.parse(node.uri).fsPath, "pom.xml");
            selectedProject = mavenExplorerProvider.mavenProjectNodes.find(project => project.pomPath.toLowerCase() === pomPath.toLowerCase());
        }

        // select a project(pomfile)
        if (!selectedProject) {
            selectedProject = await selectProjectIfNecessary();
        }

        if (!selectedProject) {
            return;
        }

        // select a command if not provided
        if (!selectedCommand) {
            const LABEL_CUSTOM: string = "Custom ...";
            const LABEL_FAVORITES: string = "Favorites ...";
            selectedCommand = await window.showQuickPick(
                [LABEL_FAVORITES, LABEL_CUSTOM, ...DEFAULT_MAVEN_LIFECYCLES],
                { placeHolder: "Select the goal to execute ...", ignoreFocusOut: true }
            );
            if (!selectedCommand) {
                return;
            }

            switch (selectedCommand) {
                case LABEL_CUSTOM:
                    await commands.executeCommand("maven.goal.custom", selectedProject);
                    return;
                case LABEL_FAVORITES:
                    await commands.executeCommand("maven.favorites", selectedProject);
                    return;
                default:
                    break;
            }
        }

        await commands.executeCommand(`maven.goal.${selectedCommand}`, selectedProject);
    }

    export function settingsFilePath(): string | undefined {
        return Settings.getSettingsFilePath();
    }
}
