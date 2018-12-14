// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Settings } from "./Settings";
import { Utils } from "./Utils";

interface ITerminalOptions {
    addNewLine?: boolean;
    name?: string;
    cwd?: string;
}

class MavenTerminal implements vscode.Disposable {
    private readonly terminals: { [id: string]: vscode.Terminal } = {};

    public runInTerminal(command: string, options?: ITerminalOptions): void {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (this.terminals[name] === undefined) {
            this.terminals[name] = vscode.window.createTerminal({ name });
            setupEnvironment(this.terminals[name]);
        }
        this.terminals[name].show();
        if (cwd) {
            this.terminals[name].sendText(getCDCommand(cwd), true);
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
    public formattedPathForTerminal(filepath: string): string {
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

    public dispose(): void {
        this.closeAllTerminals();
    }
}

function getCommand(cmd: string): string {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case 'PowerShell':
                return `cmd /c ${cmd}`; // PowerShell
            default:
                return cmd; // others, try using common one.
        }
    } else {
        return cmd;
    }
}

function getCDCommand(cwd: string): string {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case 'Git Bash':
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            case 'PowerShell':
                return `cd "${cwd}"`; // PowerShell
            case 'Command Prompt':
                return `cd /d "${cwd}"`; // CMD
            case 'WSL Bash':
                return `cd "${toWSLPath(cwd)}"`; // WSL
            default:
                return `cd "${cwd}"`; // Unknown, try using common one.
        }
    } else {
        return `cd "${cwd}"`;
    }
}

function setupEnvironment(terminal?: vscode.Terminal): void {
    // do this first so it can be overridden if desired
    const customEnv: {[envKey: string]: string} = Utils.getEnvironment();
    if (terminal) {
        Object.keys(customEnv).forEach(key => {
            terminal.sendText(composeSetEnvironmentVariableCommand(key, customEnv[key]), true);
        });
    }
}

function composeSetEnvironmentVariableCommand(variable: string, value: string): string {
    if (process.platform === "win32") {
        switch (currentWindowsShell()) {
            case 'Git Bash':
            case 'WSL Bash':
                return `export ${variable}="${value}"`; // Git Bash
            case 'PowerShell':
                return `$Env:${variable}="${value}"`; // PowerShell
            case 'Command Prompt':
                return `set ${variable}=${value}`; // CMD
            default:
                return `set ${variable}=${value}`; // Unknown, try using common one.
        }
    } else {
        return `export ${variable}="${value}"`; // general linux
    }
}

function currentWindowsShell(): string {
    const currentWindowsShellPath: string = Settings.External.defaultWindowsShell();
    if (currentWindowsShellPath.endsWith("cmd.exe")) {
        return 'Command Prompt';
    } else if (currentWindowsShellPath.endsWith("powershell.exe")) {
        return 'PowerShell';
    } else if (currentWindowsShellPath.endsWith("bash.exe") || currentWindowsShellPath.endsWith("wsl.exe")) {
        if (currentWindowsShellPath.includes("Git")) {
            return 'Git Bash';
        }
        return 'WSL Bash';
    } else {
        return 'Others';
    }
}

function toWSLPath(p: string): string {
    const arr: string[] = p.split(":\\");
    if (arr.length === 2) {
        const drive: string = arr[0].toLowerCase();
        const dir: string = arr[1].replace(/\\/g, "/");
        return `/mnt/${drive}/${dir}`;
    } else {
        return p.replace(/\\/g, '/');
    }
}

export const mavenTerminal: MavenTerminal = new MavenTerminal();
