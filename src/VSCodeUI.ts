// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import { InputBoxOptions, OpenDialogOptions, QuickPickItem, QuickPickOptions, Terminal, Uri, window, workspace } from "vscode";
import { Utils } from "./Utils";

export namespace VSCodeUI {
    const terminals: { [id: string]: Terminal } = {};

    export function runInTerminal(command: string, options?: ITerminalOptions): void {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (terminals[name] === undefined) {
            terminals[name] = window.createTerminal({ name });
            setupEnvironment(terminals[name]);
        }
        terminals[name].show();
        if (cwd) {
            terminals[name].sendText(getCDCommand(cwd), true);
        }
        terminals[name].sendText(getCommand(command), addNewLine);
    }

    export function closeAllTerminals(): void {
        Object.keys(terminals).forEach((id: string) => {
            terminals[id].dispose();
            delete terminals[id];
        });
    }

    export function getCommand(cmd: string): string {
        if (process.platform === "win32") {
            switch (Utils.currentWindowsShell()) {
                case 'PowerShell':
                    return `& ${cmd}`; // PowerShell
                default:
                    return cmd; // others, try using common one.
            }
        } else {
            return cmd;
        }
    }

    export function getCDCommand(cwd: string): string {
        if (process.platform === "win32") {
            switch (Utils.currentWindowsShell()) {
                case 'Git Bash':
                    return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
                case 'PowerShell':
                    return `cd "${cwd}"`; // PowerShell
                case 'Command Prompt':
                    return `cd /d "${cwd}"`; // CMD
                case 'WSL Bash':
                    return `cd "${Utils.toWSLPath(cwd)}"`; // WSL
                default:
                    return `cd "${cwd}"`; // Unknown, try using common one.
            }
        } else {
            return `cd "${cwd}"`;
        }
    }

    export function setupEnvironment(terminal?: Terminal): {} {
        // do this first so it can be overridden if desired
        const customEnv: any = setJavaHomeIfAvailable(terminal);

        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        };

        const environmentSettings: EnvironmentSetting[] = workspace.getConfiguration("maven").get("terminal.customEnv");
        environmentSettings.forEach((s: EnvironmentSetting) => {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand(s.environmentVariable, s.value), true);
            }
            customEnv[s.environmentVariable] = s.value;
        });
        return customEnv;
    }

    export function setJavaHomeIfAvailable(terminal?: Terminal): {} {
        // Look for the java.home setting from the redhat.java extension.  We can reuse it
        // if it exists to avoid making the user configure it in two places.
        const javaHome: string = workspace.getConfiguration("java").get<string>("home");
        const useJavaHome: boolean = workspace.getConfiguration("maven").get<boolean>("terminal.useJavaHome");
        if (useJavaHome && javaHome) {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand("JAVA_HOME", javaHome), true);
            }
            return { JAVA_HOME: javaHome };
        } else {
            return {};
        }
    }

    export function composeSetEnvironmentVariableCommand(variable: string, value: string): string {
        if (process.platform === "win32") {
            switch (Utils.currentWindowsShell()) {
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

    export function onDidCloseTerminal(closedTerminal: Terminal): void {
        try {
            delete terminals[closedTerminal.name];
        } catch (error) {
            // ignore it.
        }
    }

    export async function openDialogForFolder(customOptions: OpenDialogOptions): Promise<Uri> {
        const options: OpenDialogOptions = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
        };
        const result: Uri[] = await window.showOpenDialog(Object.assign(options, customOptions));
        if (result && result.length) {
            return Promise.resolve(result[0]);
        } else {
            return Promise.resolve(null);
        }
    }

    export async function openDialogForFile(customOptions?: OpenDialogOptions): Promise<Uri> {
        const options: OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false
        };
        const result: Uri[] = await window.showOpenDialog(Object.assign(options, customOptions));
        if (result && result.length) {
            return Promise.resolve(result[0]);
        } else {
            return Promise.resolve(null);
        }
    }

    export async function openFileIfExists(filepath: string): Promise<void> {
        if (await fs.pathExists(filepath)) {
            window.showTextDocument(Uri.file(filepath));
        }
    }

    export async function getQuickPick<T>(
        itemsSource: T[] | Promise<T[]>,
        labelfunc: (item: T) => string, descfunc: (item: T) => string,
        detailfunc: (item: T) => string, options?: QuickPickOptions
    ): Promise<T> {
        const itemWrappersPromise: Promise<IQuickPickItemEx<T>[]> = new Promise<IQuickPickItemEx<T>[]>(
            async (resolve: (value: IQuickPickItemEx<T>[]) => void, _reject: (e: Error) => void): Promise<void> => {
                const ret: IQuickPickItemEx<T>[] = (await itemsSource).map((item: T) => Object.assign({}, {
                    description: (descfunc && descfunc(item)),
                    detail: (detailfunc && detailfunc(item)),
                    label: (labelfunc && labelfunc(item)),
                    value: item
                }));
                resolve(ret);
            }
        );

        const selected: IQuickPickItemEx<T> = await window.showQuickPick(itemWrappersPromise, Object.assign({ ignoreFocusOut: true }, options));
        return selected && selected.value;
    }

    export async function getFromInputBox(options?: InputBoxOptions): Promise<string> {
        return await window.showInputBox(Object.assign({ ignoreFocusOut: true }, options));

    }
}

interface ITerminalOptions {
    addNewLine?: boolean;
    name?: string;
    cwd?: string;
}

interface IQuickPickItemEx<T> extends QuickPickItem {
    value: T;
}
