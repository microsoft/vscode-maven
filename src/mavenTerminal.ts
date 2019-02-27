// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { Settings } from "./Settings";
import { executeCommand } from "./utils/cpUtils";

interface ITerminalOptions {
    addNewLine?: boolean;
    name?: string;
    cwd?: string;
}

class MavenTerminal implements vscode.Disposable {
    private readonly terminals: { [id: string]: vscode.Terminal } = {};

    public async runInTerminal(command: string, options?: ITerminalOptions): Promise<void> {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (this.terminals[name] === undefined) {
            const env: {[envKey: string]: string} = Settings.getEnvironment();
            this.terminals[name] = vscode.window.createTerminal({ name, env });
        }
        this.terminals[name].show();
        if (cwd) {
            this.terminals[name].sendText(await getCDCommand(cwd), true);
        }
        this.terminals[name].sendText(getCommand(command), addNewLine);
    }

    public closeAllTerminals(): void {
        Object.keys(this.terminals).forEach((id: string) => {
            this.terminals[id].dispose();
            delete this.terminals[id];
        });
    }

    public onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        try {
            delete this.terminals[closedTerminal.name];
        } catch (error) {
            // ignore it.
        }
    }

    // To Refactor: remove from here.
    public async formattedPathForTerminal(filepath: string): Promise<string> {
        if (process.platform === "win32") {
            switch (currentWindowsShell()) {
                case "WSL Bash":
                    return await toWslPath(filepath);
                default:
                    return filepath;
            }
        } else {
            return filepath;
        }
    }

    public dispose(): void {
        this.closeAllTerminals();
    }
}

function getCommand(cmd: string): string {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case "PowerShell":
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
            case "Git Bash":
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            case "PowerShell":
                return `cd "${cwd}"`; // PowerShell
            case "Command Prompt":
                return `cd /d "${cwd}"`; // CMD
            case "WSL Bash":
                return `cd "${await toWslPath(cwd)}"`; // WSL
            default:
                return `cd "${cwd}"`; // Unknown, try using common one.
        }
    } else {
        return `cd "${cwd}"`;
    }
}

function currentWindowsShell(): string {
    const currentWindowsShellPath: string = Settings.External.defaultWindowsShell();
    if (currentWindowsShellPath.endsWith("cmd.exe")) {
        return "Command Prompt";
    } else if (currentWindowsShellPath.endsWith("powershell.exe")) {
        return "PowerShell";
    } else if (currentWindowsShellPath.endsWith("bash.exe") || currentWindowsShellPath.endsWith("wsl.exe")) {
        if (currentWindowsShellPath.includes("Git")) {
            return "Git Bash";
        }
        return "WSL Bash";
    } else {
        return "Others";
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
