// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as md5 from "md5";
import * as path from "path";
import * as vscode from "vscode";
import { mavenOutputChannel } from "../mavenOutputChannel";
import { ITerminalOptions, mavenTerminal } from "../mavenTerminal";
import { Settings } from "../Settings";
import { getPathToTempFolder, getPathToWorkspaceStorage, getPathToExtensionRoot } from "./contextUtils";
import { updateLRUCommands } from "./historyUtils";

export async function rawEffectivePom(pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempTolder(pomPath);
    await executeInBackground(`help:effective-pom -Doutput="${outputPath}"`, pomPath);
    const pomxml: string | undefined = await readFileIfExists(outputPath);
    await fse.remove(outputPath);
    return pomxml;
}

export async function rawDependencyTree(pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempTolder(pomPath);
    await executeInBackground(`dependency:tree -Dverbose -DoutputFile="${outputPath}"`, pomPath);
    const pomxml: string | undefined = await readFileIfExists(outputPath);
    await fse.remove(outputPath);
    return pomxml;
}

export async function pluginDescription(pluginId: string, pomPath: string): Promise<string | undefined> {
    const outputPath: string = getTempTolder(pluginId);
    // For MacOSX, add "-Dapple.awt.UIElement=true" to prevent showing icons in dock
    await executeInBackground(`help:describe -Dapple.awt.UIElement=true -Dplugin=${pluginId} -Doutput="${outputPath}"`, pomPath);
    const content: string | undefined = await readFileIfExists(outputPath);
    await fse.remove(outputPath);
    return content;
}

async function executeInBackground(mvnArgs: string, pomfile?: string): Promise<any> {
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const mvn: string = await getMaven(workspaceFolder);
    const command: string = await wrappedWithQuotes(mvn);
    const cwd: string | undefined = workspaceFolder ? path.resolve(workspaceFolder.uri.fsPath, mvn, "..") : undefined;
    const userArgs: string | undefined = Settings.Executable.options(pomfile);
    const matched: RegExpMatchArray | null = [mvnArgs, userArgs].filter(Boolean).join(" ").match(/(?:[^\s"]+|"[^"]*")+/g); // Split by space, but ignore spaces in quotes
    const args: string[] = matched !== null ? matched : [];
    if (pomfile) {
        args.push("-f", `"${pomfile}"`);
    }
    const spawnOptions: child_process.SpawnOptions = {
        cwd,
        env: Object.assign({}, process.env, Settings.getEnvironment()),
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
        proc.stdout.on("data", (chunk: Buffer) => {
            mavenOutputChannel.append(chunk.toString());
        });
        proc.stderr.on("data", (chunk: Buffer) => {
            mavenOutputChannel.append(chunk.toString());
        });
    });
}

export async function executeInTerminal(command: string, pomfile?: string, options?: ITerminalOptions): Promise<vscode.Terminal> {
    const workspaceFolder: vscode.WorkspaceFolder | undefined = pomfile ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomfile)) : undefined;
    const mvnString: string = wrappedWithQuotes(await mavenTerminal.formattedPathForTerminal(await getMaven(workspaceFolder)));
    const fullCommand: string = [
        mvnString,
        command.trim(),
        pomfile && `-f "${await mavenTerminal.formattedPathForTerminal(pomfile)}"`,
        Settings.Executable.options(pomfile)
    ].filter(Boolean).join(" ");
    const name: string = workspaceFolder ? `Maven-${workspaceFolder.name}` : "Maven";
    const terminal: vscode.Terminal = await mavenTerminal.runInTerminal(fullCommand, Object.assign({ name }, options));
    if (pomfile) {
        await updateLRUCommands(command, pomfile);
    }
    return terminal;
}

async function getMaven(workspaceFolder?: vscode.WorkspaceFolder): Promise<string> {
    const workspaceFolderUri : vscode.Uri | undefined = workspaceFolder && workspaceFolder.uri;
    const mvnPathFromSettings = Settings.Executable.path(workspaceFolderUri);
    if (mvnPathFromSettings) {
        return mvnPathFromSettings;
    }

    const preferMavenWrapper: boolean = Settings.Executable.preferMavenWrapper(workspaceFolderUri);
    if (preferMavenWrapper) {
        const localMvnwPath: string | undefined = workspaceFolderUri && path.join(workspaceFolderUri.fsPath, "mvnw");
        if (localMvnwPath && await fse.pathExists(localMvnwPath)) {
            return localMvnwPath;
        } else {
            return getPathToExtensionRoot("mvnw", "mvnw");
        }
    } else {
        return "mvn";
    }
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

function getTempTolder(identifier: string): string {
    const outputPath: string | undefined = getPathToWorkspaceStorage(md5(identifier));
    return outputPath ? outputPath : getPathToTempFolder(md5(identifier));
}
