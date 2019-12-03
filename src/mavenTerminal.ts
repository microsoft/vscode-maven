// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { Settings } from "./Settings";
import { executeCommand } from "./utils/cpUtils";

export interface ITerminalOptions {
    addNewLine?: boolean;
    name: string;
    cwd?: string;
    env?: { [key: string]: string };
}

enum WindowsShellType {
    CMD = "Command Prompt",
    POWER_SHELL = "PowerShell",
    GIT_BASH = "Git Bash",
    WSL = "WSL Bash",
    OHTERS = "Others"
}

class MavenTerminal implements vscode.Disposable {
    private readonly terminals: { [id: string]: vscode.Terminal } = {};

    public async runInTerminal(command: string, options: ITerminalOptions): Promise<vscode.Terminal> {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (this.terminals[name] === undefined) {
            const env: { [envKey: string]: string } = { ...Settings.getEnvironment(), ...options.env };
            this.terminals[name] = vscode.window.createTerminal({ name, env });
            // Workaround for WSL custom envs.
            // See: https://github.com/Microsoft/vscode/issues/71267
            if (currentWindowsShell() === WindowsShellType.WSL) {
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
                case WindowsShellType.WSL:
                    return await toWslPath(filepath);
                default:
                    return filepath;
            }
        } else {
            return filepath;
        }
    }

    public dispose(terminalName?: string): void {
        if (terminalName) {
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
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case WindowsShellType.POWER_SHELL:
                return `cmd /c ${cmd}`; // PowerShell
            default:
                return cmd; // others, try using common one.
        }
    } else {
        return cmd;
    }
}

async function getCDCommand(cwd: string): Promise<string> {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case WindowsShellType.GIT_BASH:
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            case WindowsShellType.POWER_SHELL:
                // Escape '[' and ']' in PowerShell
                // See: https://github.com/microsoft/vscode-maven/issues/324
                const escaped: string = cwd.replace(/([\[\]])/g, "``$1");
                return `cd "${escaped}"`; // PowerShell
            case WindowsShellType.CMD:
                return `cd /d "${cwd}"`; // CMD
            case WindowsShellType.WSL:
                return `cd "${await toWslPath(cwd)}"`; // WSL
            default:
                return `cd "${cwd}"`; // Unknown, try using common one.
        }
    } else {
        return `cd "${cwd}"`;
    }
}

function currentWindowsShell(): WindowsShellType {
    const currentWindowsShellPath: string = vscode.env.shell;

    if (currentWindowsShellPath.endsWith("cmd.exe")) {
        return WindowsShellType.CMD;
    } else if (currentWindowsShellPath.endsWith("powershell.exe")) {
        return WindowsShellType.POWER_SHELL;
    } else if (currentWindowsShellPath.endsWith("bash.exe") || currentWindowsShellPath.endsWith("wsl.exe")) {
        if (currentWindowsShellPath.includes("Git")) {
            return WindowsShellType.GIT_BASH;
        }
        return WindowsShellType.WSL;
    } else {
        return WindowsShellType.OHTERS;
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

export async function toWslPath(path: string): Promise<string> {
    try {
        return (await executeCommand("wsl", ["wslpath", "-u", `"${path.replace(/\\/g, "/")}"`])).trim();
    } catch (error) {
        mavenOutputChannel.appendLine(error, "WSL");
        return toDefaultWslPath(path);
    }
}

export async function toWinPath(path: string): Promise<string> {
    return (await executeCommand("wsl", ["wslpath", "-w", `"${path}"`])).trim();
}

export const mavenTerminal: MavenTerminal = new MavenTerminal();

function setupEnvForWSL(terminal: vscode.Terminal, env: { [envKey: string]: string }): void {
    if (terminal !== undefined) {
        Object.keys(env).forEach(key => {
            terminal.sendText(`export ${key}="${env[key]}"`, true);
        });
    }
}
