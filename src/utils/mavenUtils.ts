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
import { MavenProjectManager } from "../project/MavenProjectManager";
import { Settings } from "../Settings";
import { getPathToExtensionRoot, getPathToTempFolder, getPathToWorkspaceStorage } from "./contextUtils";
import { mavenProblemMatcher } from "../mavenProblemMatcher";
import { MavenNotFoundError } from "./errorUtils";
import { updateLRUCommands } from "./historyUtils";

// calculate dependency graph
const GOAL_DEPENDENCY_GRAPH = "com.github.ferstl:depgraph-maven-plugin:4.0.2:graph";
const OPTIONS_DEPENDENCY_GRAPH = "-DgraphFormat=text -DshowDuplicates -DshowConflicts -DshowVersions -DshowGroupIds";

/**
 * Get effective pom of a Maven project.
 *
 * @param pomPath absolute path of pom.xml
 * @param options specify the way you want to get effective pom. By default it 1) reads from cache if exists 2) calculate if not.
 * @returns full content of effective pom
 */
export async function rawEffectivePom(pomPath: string, options?: {cacheOnly?: boolean}): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pomPath);
    const epomPath = `${outputPath}.epom`;
    const mtimePath = `${outputPath}.mtime`;
    const cachedMTimeMs: string | undefined = await readFileIfExists(mtimePath);
    const stat: fse.Stats = await fse.stat(pomPath);
    const mtimeMs: string = stat.mtimeMs.toString();

    if (cachedMTimeMs === mtimeMs || options?.cacheOnly) {
        return await readFileIfExists(epomPath);
    }

    await executeInBackground(`-B -Doutput="${epomPath}" help:effective-pom`, pomPath);
    await fse.writeFile(mtimePath, mtimeMs);
    return await readFileIfExists(epomPath);
}

export async function rawDependencyTree(pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pomPath);
    const dependencyGraphPath = `${outputPath}.deps.txt`;
    const outputDirectory: string = path.dirname(dependencyGraphPath);
    const outputFileName: string = path.basename(dependencyGraphPath);
    await executeInBackground(`-B -N ${OPTIONS_DEPENDENCY_GRAPH} -DoutputDirectory="${outputDirectory}" -DoutputFileName="${outputFileName}" ${GOAL_DEPENDENCY_GRAPH}`, pomPath);
    return await readFileIfExists(path.join(outputDirectory, outputFileName));
}

export async function pluginDescription(pluginId: string, pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pluginId);
    // For MacOSX, add "-Dapple.awt.UIElement=true" to prevent showing icons in dock
    await executeInBackground(`-B -Dapple.awt.UIElement=true -Dplugin=${pluginId} -Doutput="${outputPath}" help:describe`, pomPath);
    return await readFileIfExists(outputPath);
}

export async function rawProfileList(pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempFolder(pomPath);
    const profileListPath = `${outputPath}.profiles.txt`;
    await executeInBackground(`-B -Doutput="${profileListPath}" help:all-profiles`, pomPath);
    return await readFileIfExists(profileListPath);
}

async function executeInBackground(mvnArgs: string, pomfile?: string): Promise<unknown> {
    const mvn: string | undefined = await getMaven(pomfile);
    if (mvn === undefined) {
        throw new MavenNotFoundError();
    }

    const command: string = wrappedWithQuotes(mvn);
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const cwd: string | undefined = pomfile ? path.dirname(pomfile) : workspaceFolder?.uri.fsPath;
    const userArgs: string | undefined = Settings.Executable.options(pomfile);
    const mvnSettingsFile: string | undefined = Settings.getSettingsFilePath();
    const mvnSettingsArg: string | undefined = mvnSettingsFile ? `-s "${await mavenTerminal.formattedPathForTerminal(mvnSettingsFile)}"` : undefined;
    const matched: RegExpMatchArray | null = [mvnSettingsArg, mvnArgs, userArgs].filter(Boolean).join(" ").match(/(?:[^\s"]+|"[^"]*")+/g); // Split by space, but ignore spaces in quotes
    const args: string[] = matched !== null ? matched : [];
    if (pomfile) {
        args.push("-f", `"${pomfile}"`);
    }
    const spawnOptions: child_process.SpawnOptions = {
        cwd,
        env: Object.assign({}, process.env, Settings.getEnvironment(pomfile)),
        shell: true
    };
    return new Promise<unknown>((resolve: (value: unknown) => void, reject: (e: Error) => void): void => {
        mavenOutputChannel.appendLine(`Spawn ${JSON.stringify({ command, args })}`);
        const proc: child_process.ChildProcess = child_process.spawn(command, args, spawnOptions);  // CodeQL [SM03609] safe here as args is assembled in the code and cannot be arbitrary string.
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
        let outputBuffer = "";
        if (proc.stdout !== null) {
            proc.stdout.on("data", (chunk: Buffer) => {
                const output = chunk.toString();
                outputBuffer += output;
                mavenOutputChannel.append(output);
            });
        }
        if (proc.stderr !== null) {
            proc.stderr.on("data", (chunk: Buffer) => {
                const output = chunk.toString();
                outputBuffer += output;
                mavenOutputChannel.append(output);
            });
        }
        proc.on("close", () => {
            if (outputBuffer && pomfile) {
                mavenProblemMatcher.parseMavenOutput(outputBuffer, path.dirname(pomfile));
            }
        });
    });
}

export async function executeInTerminal(options: {
    command: string;
    mvnPath?: string;
    pomfile?: string;
    cwd?: string;
    env?: { [key: string]: string };
    terminalName?: string;
    skipProblemMatching?: boolean;
}): Promise<vscode.Terminal | undefined> {
    const { command, mvnPath, pomfile, cwd, env, terminalName, skipProblemMatching } = options;
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const mvn: string | undefined = mvnPath ? mvnPath : await getMaven(pomfile);
    if (mvn === undefined) {
        await promptToSettingMavenExecutable();
        return undefined;
    }

    const mvnString: string = wrappedWithQuotes(await mavenTerminal.formattedPathForTerminal(mvn));
    const mvnSettingsFile: string | undefined = Settings.getSettingsFilePath();

    // profiles
    let profileOptions: string | undefined;
    if (pomfile) {
        const project = MavenProjectManager.get(pomfile);
        const selectedIds = project?.profiles?.filter(p => p.selected === true)?.map(p => p.id) ?? [];
        const unselectedIds = project?.profiles?.filter(p => p.selected === false)?.map(p => `-${p.id}`) ?? [];
        const profileList = selectedIds.concat(unselectedIds).join(",");
        if (profileList) {
            profileOptions = `-P="${profileList}"`;
        }
    }
    const fullCommand: string = [
        mvnString,
        mvnSettingsFile && `-s "${await mavenTerminal.formattedPathForTerminal(mvnSettingsFile)}"`,
        command.trim(),
        pomfile && `-f "${await mavenTerminal.formattedPathForTerminal(pomfile)}"`,
        profileOptions,
        Settings.Executable.options(pomfile)
    ].filter(Boolean).join(" ");
    const name: string = terminalName || (workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven");
    const terminal: vscode.Terminal = await mavenTerminal.runInTerminal(fullCommand, { name, cwd, env, workspaceFolder });
    if (pomfile) {
        await updateLRUCommands(command, pomfile);
        if (!skipProblemMatching) {
            // Also run in background to capture output for problem matching
            executeInBackground(command, pomfile).catch(() => {/* ignore errors, just for problem matching */});
        }
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
    const SETTING_MAVEN_EXECUTABLE_PATH = "maven.executable.path";
    const MESSAGE = `Maven executable not found in PATH. Please specify "${SETTING_MAVEN_EXECUTABLE_PATH}".`;
    const BUTTON_GOTO_SETTINGS = "Open Settings";
    const BUTTON_BROWSE_FOR_MAVEN = "Browse...";

    const choice: string | undefined = await vscode.window.showInformationMessage(MESSAGE, BUTTON_GOTO_SETTINGS, BUTTON_BROWSE_FOR_MAVEN);
    switch (choice) {
        case BUTTON_GOTO_SETTINGS:{
            await vscode.commands.executeCommand("workbench.action.openSettings", SETTING_MAVEN_EXECUTABLE_PATH);
            break;
        }
        case BUTTON_BROWSE_FOR_MAVEN: {
            const mvnPath = await browseForMavenBinary();
            if (mvnPath) {
                Settings.setMavenExecutablePath(mvnPath);
                await vscode.window.showInformationMessage(`Successfully set "${SETTING_MAVEN_EXECUTABLE_PATH}" to: ${mvnPath}`);
            }
            break;
        }
        default:
            break;
    }
}

async function browseForMavenBinary(): Promise<string | undefined> {
    const mvnFilename: string = isWin() ? "mvn.cmd" : "mvn";
    const filters = isWin() ? { Executable: ["cmd"] } : undefined;

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
