// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { Settings } from "./Settings";
import { executeCommand } from "./utils/cpUtils";

export interface ITerminalOptions {
    addNewLine?: boolean;
    name: string;
    cwd?: string;
    env?: { [key: string]: string };
    workspaceFolder?: vscode.WorkspaceFolder;
}

enum ShellType {
    CMD = "Command Prompt",
    POWERSHELL = "PowerShell",
    GIT_BASH = "Git Bash",
    WSL = "WSL Bash",
    OTHERS = "Others"
}

class MavenTerminal implements vscode.Disposable {
    private readonly terminals: { [id: string]: vscode.Terminal } = {};

    public async runInTerminal(command: string, options: ITerminalOptions): Promise<vscode.Terminal> {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd, workspaceFolder } = Object.assign(defaultOptions, options);
        if (this.terminals[name] === undefined) {
            // Open terminal in workspaceFolder if provided
            // See: https://github.com/microsoft/vscode-maven/issues/467#issuecomment-584544090
            const terminalCwd: vscode.Uri | undefined = workspaceFolder ? workspaceFolder.uri : undefined;
            const env: { [envKey: string]: string } = { ...Settings.getEnvironment(terminalCwd), ...options.env };
            this.terminals[name] = vscode.window.createTerminal({ name, env, cwd: terminalCwd });
            // Workaround for WSL custom envs.
            // See: https://github.com/Microsoft/vscode/issues/71267
            if (currentWindowsShell() === ShellType.WSL) {
                setupEnvForWSL(this.terminals[name], env);
            }
        }
        this.terminals[name].show();
        if (cwd) {
            this.terminals[name].sendText(await getCDCommand(cwd), true);
        }
        this.terminals[name].sendText(getCommand(command), addNewLine);
        return this.terminals[name];
    }

    // To Refactor: remove from here.
    public async formattedPathForTerminal(filepath: string): Promise<string> {
        if (process.platform === "win32") {
            switch (currentWindowsShell()) {
                case ShellType.WSL:
                    return await toWslPath(filepath);
                default:
                    return filepath;
            }
        } else {
            return filepath;
        }
    }

    public dispose(terminalName?: string): void {
        if (terminalName && this.terminals[terminalName] !== undefined) {
            this.terminals[terminalName].dispose();
            delete this.terminals[terminalName];
        } else {
            Object.keys(this.terminals).forEach((id: string) => {
                this.terminals[id].dispose();
                delete this.terminals[id];
            });
        }
    }
}

function getCommand(cmd: string): string {
    if (currentWindowsShell() === ShellType.POWERSHELL) {
        return `& ${cmd}`;
    } else {
        return cmd;
    }
}

async function getCDCommand(cwd: string): Promise<string> {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case ShellType.GIT_BASH:
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            case ShellType.POWERSHELL:
                // Escape '[' and ']' in PowerShell
                // See: https://github.com/microsoft/vscode-maven/issues/324
                const escaped: string = cwd.replace(/([\[\]])/g, "``$1");
                return `cd "${escaped}"`; // PowerShell
            case ShellType.CMD:
                return `cd /d "${cwd}"`; // CMD
            case ShellType.WSL:
                return `cd "${await toWslPath(cwd)}"`; // WSL
            default:
                return `cd "${cwd}"`; // Unknown, try using common one.
        }
    } else {
        return `cd "${cwd}"`;
    }
}

function currentWindowsShell(): ShellType {
    const currentWindowsShellPath: string = vscode.env.shell;
    const binaryName: string = path.basename(currentWindowsShellPath);
    switch (binaryName) {
        case "cmd.exe":
            return ShellType.CMD;
        case "pwsh.exe":
        case "powershell.exe":
        case "pwsh": // pwsh on mac/linux
            return ShellType.POWERSHELL;
        case "bash.exe":
        case "wsl.exe":
            if (currentWindowsShellPath.indexOf("Git") > 0) {
                return ShellType.GIT_BASH;
            }
            return ShellType.WSL;
        default:
            return ShellType.OTHERS;
    }
}

function toDefaultWslPath(p: string): string {
    const arr: string[] = p.split(":\\");
    if (arr.length === 2) {
        const drive: string = arr[0].toLowerCase();
        const dir: string = arr[1].replace(/\\/g, "/");
        return `/mnt/${drive}/${dir}`;
    } else {
        return p.replace(/\\/g, "/");
    }
}

export async function toWslPath(filepath: string): Promise<string> {
    try {
        return (await executeCommand("wsl", ["wslpath", "-u", `"${filepath.replace(/\\/g, "/")}"`])).trim();
    } catch (error) {
        mavenOutputChannel.appendLine(error, "WSL");
        return toDefaultWslPath(filepath);
    }
}

export async function toWinPath(filepath: string): Promise<string> {
    return (await executeCommand("wsl", ["wslpath", "-w", `"${filepath}"`])).trim();
}

export const mavenTerminal: MavenTerminal = new MavenTerminal();

function setupEnvForWSL(terminal: vscode.Terminal, env: { [envKey: string]: string }): void {
    if (terminal !== undefined) {
        Object.keys(env).forEach(key => {
            terminal.sendText(`export ${key}="${env[key]}"`, true);
        });
    }
}
