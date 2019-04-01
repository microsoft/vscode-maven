// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as http from "http";
import * as https from "https";
import * as md5 from "md5";
import * as url from "url";
import { commands, Progress, ProgressLocation, RelativePattern, TextDocument, Uri, ViewColumn, window, workspace, WorkspaceFolder } from "vscode";
import { createUuid, setUserError } from "vscode-extension-telemetry-wrapper";
import * as xml2js from "xml2js";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MavenProject } from "../explorer/model/MavenProject";
import { Settings } from "../Settings";
import { getExtensionVersion, getPathToTempFolder, getPathToWorkspaceStorage } from "./contextUtils";
import { getLRUCommands, ICommandHistoryEntry } from "./historyUtils";
import { executeInTerminal, pluginDescription, rawEffectivePom } from "./mavenUtils";

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
            const options: Object = Object.assign({ headers: Object.assign({}, customHeaders, { "User-Agent": `vscode/${getExtensionVersion()}` }) }, urlObj);
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

    export async function getAllPomPaths(workspaceFolder: WorkspaceFolder): Promise<string[]> {
        const exclusions: string[] = Settings.excludedFolders(workspaceFolder.uri);
        const pomFileUris: Uri[] = await workspace.findFiles(new RelativePattern(workspaceFolder, "**/pom.xml"), `{${exclusions.join(",")}}`);
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

        let pomxml: string | undefined;
        const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
        if (project) {
            pomxml = await project.calculateEffectivePom();
        } else {
            pomxml = await getEffectivePom(pomPath);
        }
        if (!pomxml) {
            throw new Error("Fail to get effective pom.");
        }

        const document: TextDocument = await workspace.openTextDocument({ language: "xml", content: pomxml });
        await window.showTextDocument(document, ViewColumn.Active);
    }

    export async function getEffectivePom(pomPathOrMavenProject: string | MavenProject): Promise<string | undefined> {
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
        return await window.withProgress({ location: ProgressLocation.Window }, async (p: Progress<{ message?: string }>) => new Promise<string>(
            async (resolve, reject): Promise<void> => {
                p.report({ message: `Generating Effective POM: ${name}` });
                try {
                    const ret: string | undefined = await rawEffectivePom(pomPath);
                    resolve(ret ? ret : "");
                } catch (error) {
                    setUserError(<Error>error);
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
                    setUserError(<Error>error);
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
            await executeInTerminal(trimmedGoals, pomPath);
        }
    }

    export async function executeHistoricalGoals(projectPomPaths: string[]): Promise<void> {
        const candidates: ICommandHistoryEntry[] = <ICommandHistoryEntry[]>Array.prototype.concat.apply(
            [],
            await Promise.all(projectPomPaths.map(getLRUCommands))
        );
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
            await executeInTerminal(selected.command, selected.pomPath);
        }
    }

    export async function executeMavenCommand(): Promise<void> {
        // select a project(pomfile)
        const selectedProject: MavenProject | undefined = await window.showQuickPick(
            mavenExplorerProvider.mavenProjectNodes.map(item => ({
                value: item,
                label: `$(primitive-dot) ${item.name}`,
                description: undefined,
                detail: item.pomPath
            })),
            { placeHolder: "Select a Maven project ...", ignoreFocusOut: true }
        ).then(item => item ? item.value : undefined);
        if (!selectedProject) {
            return;
        }

        const LABEL_CUSTOM: string = "Custom ...";
        const LABEL_FAVORITES: string = "Favorites ...";
        // select a command
        const selectedCommand: string | undefined = await window.showQuickPick(
            [LABEL_FAVORITES, LABEL_CUSTOM, "clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"],
            { placeHolder: "Select the goal to execute ...", ignoreFocusOut: true }
        );
        if (!selectedCommand) {
            return;
        }

        switch (selectedCommand) {
            case LABEL_CUSTOM:
                await commands.executeCommand("maven.goal.custom", selectedProject);
                break;
            case LABEL_FAVORITES:
                await commands.executeCommand("maven.favorites", selectedProject);
                break;
            default:
                await commands.executeCommand(`maven.goal.${selectedCommand}`, selectedProject);
                break;
        }
    }
}
