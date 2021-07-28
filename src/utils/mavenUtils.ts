// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as expandHome from "expand-home-dir";
import * as fse from "fs-extra";
import * as md5 from "md5";
import * as path from "path";
import * as vscode from "vscode";
import * as which from "which";
import { mavenOutputChannel } from "../mavenOutputChannel";
import { mavenTerminal } from "../mavenTerminal";
import { Settings } from "../Settings";
import { getPathToExtensionRoot, getPathToTempFolder, getPathToWorkspaceStorage } from "./contextUtils";
import { MavenNotFoundError } from "./errorUtils";
import { updateLRUCommands } from "./historyUtils";

/**
 * Get effective pom of a Maven project.
 *
 * @param pomPath absolute path of pom.xml
 * @param options specify the way you want to get effective pom. By default it 1) reads from cache if exists 2) calculate if not.
 * @returns full content of effective pom
 */
export async function rawEffectivePom(pomPath: string, options?: {cacheOnly?: boolean}): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pomPath);
    const epomPath: string = `${outputPath}.epom`;
    const mtimePath: string = `${outputPath}.mtime`;
    const cachedMTimeMs: string | undefined = await readFileIfExists(mtimePath);
    const stat: fse.Stats = await fse.stat(pomPath);
    const mtimeMs: string = stat.mtimeMs.toString();

    if (cachedMTimeMs === mtimeMs || options?.cacheOnly) {
        return await readFileIfExists(epomPath);
    }

    await executeInBackground(`help:effective-pom -Doutput="${epomPath}"`, pomPath);
    await fse.writeFile(mtimePath, mtimeMs);
    return await readFileIfExists(epomPath);
}

export async function rawDependencyTree(pomPath: string): Promise<any> {
    const outputPath: string = getTempFolder(pomPath);
    const dependencyGraphPath: string = `${outputPath}.deps.txt`;
    const outputDirectory: string = path.dirname(dependencyGraphPath);
    const outputFileName: string = path.basename(dependencyGraphPath);
    await executeInBackground(`com.github.ferstl:depgraph-maven-plugin:graph -DgraphFormat=text -DshowDuplicates -DshowConflicts -DshowVersions -DshowGroupIds -DoutputDirectory="${outputDirectory}" -DoutputFileName="${outputFileName}"`, pomPath);
    return await readFileIfExists(path.join(outputDirectory, outputFileName));
}

export async function pluginDescription(pluginId: string, pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pluginId);
    // For MacOSX, add "-Dapple.awt.UIElement=true" to prevent showing icons in dock
    await executeInBackground(`help:describe -Dapple.awt.UIElement=true -Dplugin=${pluginId} -Doutput="${outputPath}"`, pomPath);
    return await readFileIfExists(outputPath);
}

async function executeInBackground(mvnArgs: string, pomfile?: string): Promise<any> {
    const mvn: string | undefined = await getMaven(pomfile);
    if (mvn === undefined) {
        throw new MavenNotFoundError();
    }

    const command: string = wrappedWithQuotes(mvn);
    // TODO: re-visit cwd
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const cwd: string | undefined = workspaceFolder ? path.resolve(workspaceFolder.uri.fsPath, mvn, "..") : undefined;
    const userArgs: string | undefined = Settings.Executable.options(pomfile);
    const matched: RegExpMatchArray | null = [mvnArgs, userArgs].filter(Boolean).join(" ").match(/(?:[^\s"]+|"[^"]*")+/g); // Split by space, but ignore spaces in quotes
    const args: string[] = matched !== null ? matched : [];
    if (pomfile) {
        args.push("-f", `"${pomfile}"`);
    }
    const spawnOptions: child_process.SpawnOptions = {
        cwd,
        env: Object.assign({}, process.env, Settings.getEnvironment(pomfile)),
        shell: true
    };
    return new Promise<{}>((resolve: (value: any) => void, reject: (e: Error) => void): void => {
        mavenOutputChannel.appendLine(`Spawn ${JSON.stringify({ command, args })}`);
        const proc: child_process.ChildProcess = child_process.spawn(command, args, spawnOptions);
        proc.on("error", (err: Error) => {
            reject(new Error(`Error occurred in background process. ${err.message}`));
        });
        proc.on("exit", (code: number, signal: string) => {
            if (code !== null) {
                if (code === 0) {
                    resolve(code);
                } else {
                    reject(new Error(`Background process terminated with code ${code}.`));
                }
            } else {
                reject(new Error(`Background process killed by signal ${signal}.`));
            }
        });
        if (proc.stdout !== null) {
            proc.stdout.on("data", (chunk: Buffer) => {
                mavenOutputChannel.append(chunk.toString());
            });
        }
        if (proc.stderr !== null) {
            proc.stderr.on("data", (chunk: Buffer) => {
                mavenOutputChannel.append(chunk.toString());
            });
        }
    });
}

export async function executeInTerminal(options: {
    command: string;
    mvnPath?: string;
    pomfile?: string;
    cwd?: string;
    env?: { [key: string]: string };
    terminalName?: string;
}): Promise<vscode.Terminal | undefined> {
    const { command, mvnPath, pomfile, cwd, env, terminalName } = options;
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const mvn: string | undefined = mvnPath ? mvnPath : await getMaven(pomfile);
    if (mvn === undefined) {
        await promptToSettingMavenExecutable();
        return undefined;
    }

    const mvnString: string = wrappedWithQuotes(await mavenTerminal.formattedPathForTerminal(mvn));
    const fullCommand: string = [
        mvnString,
        command.trim(),
        pomfile && `-f "${await mavenTerminal.formattedPathForTerminal(pomfile)}"`,
        Settings.Executable.options(pomfile)
    ].filter(Boolean).join(" ");
    const name: string = terminalName || (workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven");
    const terminal: vscode.Terminal = await mavenTerminal.runInTerminal(fullCommand, { name, cwd, env, workspaceFolder });
    if (pomfile) {
        await updateLRUCommands(command, pomfile);
    }
    return terminal;
}

export async function getMaven(pomPath?: string): Promise<string | undefined> {
    const mvnPathFromSettings: string | undefined = Settings.Executable.path(pomPath);
    if (mvnPathFromSettings) {
        // expand tilde to deal with ~/path-to-mvn
        return expandHome(mvnPathFromSettings);
    }

    const preferMavenWrapper: boolean = Settings.Executable.preferMavenWrapper(pomPath);
    if (preferMavenWrapper && pomPath && vscode.workspace.isTrusted) {
        const localMvnwPath: string | undefined = await getLocalMavenWrapper(path.dirname(pomPath));
        if (localMvnwPath) {
            return localMvnwPath;
        }
    }

    return await defaultMavenExecutable();
}

export function getEmbeddedMavenWrapper(): string {
    const mvnw: string = isWin() ? "mvnw.cmd" : "mvnw";
    return getPathToExtensionRoot("resources", "maven-wrapper", mvnw);
}

async function getLocalMavenWrapper(projectFolder: string): Promise<string | undefined> {
    const mvnw: string = isWin() ? "mvnw.cmd" : "mvnw";

    // walk up parent folders
    let current: string = projectFolder;
    while (path.basename(current)) {
        const potentialMvnwPath: string = path.join(current, mvnw);
        if (await fse.pathExists(potentialMvnwPath)) {
            return potentialMvnwPath;
        }
        current = path.dirname(current);

        const folderUri = vscode.Uri.file(current);
        if (vscode.workspace.getWorkspaceFolder(folderUri) === undefined) {
            // traverse up to workspace root as trust granted
            return undefined;
        }
    }
    return undefined;
}

async function defaultMavenExecutable(): Promise<string | undefined> {
    return new Promise<string | undefined>((resolve) => {
        which("mvn", (_err, filepath) => {
            if (filepath) {
                resolve("mvn");
            } else {
                mavenOutputChannel.appendLine("Maven executable not found in PATH.");
                resolve(undefined);
            }
        });
    });
}

function wrappedWithQuotes(mvn: string): string {
    if (mvn === "mvn") {
        return mvn;
    } else {
        return `"${mvn}"`;
    }
}

async function readFileIfExists(filepath: string): Promise<string | undefined> {
    if (await fse.pathExists(filepath)) {
        return (await fse.readFile(filepath)).toString();
    }
    return undefined;
}

function getTempFolder(identifier: string): string {
    const outputPath: string | undefined = getPathToWorkspaceStorage(md5(identifier));
    return outputPath ? outputPath : getPathToTempFolder(md5(identifier));
}

export async function promptToSettingMavenExecutable(): Promise<void> {
    const SETTING_MAVEN_EXECUTABLE_PATH: string = "maven.executable.path";
    const MESSAGE: string = `Maven executable not found in PATH. Please specify "${SETTING_MAVEN_EXECUTABLE_PATH}".`;
    const BUTTON_GOTO_SETTINGS: string = "Open Settings";
    const BUTTON_BROWSE_FOR_MAVEN: string = "Browse...";

    const choice: string | undefined = await vscode.window.showInformationMessage(MESSAGE, BUTTON_GOTO_SETTINGS, BUTTON_BROWSE_FOR_MAVEN);
    switch (choice) {
        case BUTTON_GOTO_SETTINGS:
            await vscode.commands.executeCommand("workbench.action.openSettings", SETTING_MAVEN_EXECUTABLE_PATH);
            break;
        case BUTTON_BROWSE_FOR_MAVEN:
            const mvnPath: string | undefined = await browseForMavenBinary();
            if (mvnPath) {
                Settings.setMavenExecutablePath(mvnPath);
                await vscode.window.showInformationMessage(`Successfully set "${SETTING_MAVEN_EXECUTABLE_PATH}" to: ${mvnPath}`);
            }
            break;
        default:
            break;
    }
}

async function browseForMavenBinary(): Promise<string | undefined> {
    const mvnFilename: string = isWin() ? "mvn.cmd" : "mvn";
    const filters: any = isWin() ? { Executable: ["cmd"] } : undefined;

    const selectedUris: vscode.Uri[] | undefined = await vscode.window.showOpenDialog({
        openLabel: `Select ${mvnFilename}`,
        canSelectMany: false,
        filters
    });
    if (selectedUris === undefined) {
        return undefined;
    }

    const mvnPath: string | undefined = selectedUris.length > 0 && selectedUris[0] !== undefined ? selectedUris[0].fsPath : undefined;
    if (!mvnPath || !mvnPath.endsWith(mvnFilename)) {
        await vscode.window.showErrorMessage(`Maven executable file must match with name: ${mvnFilename}`);
        return undefined;
    }

    return mvnPath;
}

function isWin(): boolean {
    return process.platform.startsWith("win");
}
