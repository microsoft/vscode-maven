// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as os from "os";
import { InputBoxOptions, OpenDialogOptions, QuickPickItem, QuickPickOptions, Terminal, Uri, window, workspace } from "vscode";

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

    export function getCommand(cmd: string): string {
        if (os.platform() === "win32") {
            const windowsShell: string = workspace.getConfiguration("terminal").get<string>("integrated.shell.windows")
                .toLowerCase();
            if (windowsShell && windowsShell.indexOf("powershell.exe") > -1) {
                return `& ${cmd}`; // PowerShell
            } else {
                return cmd; // others, try using common one.
            }
        } else {
            return cmd;
        }
    }

    export function getCDCommand(cwd: string): string {
        if (os.platform() === "win32") {
            const windowsShell: string = workspace.getConfiguration("terminal").get<string>("integrated.shell.windows")
                .toLowerCase();
            if (windowsShell && windowsShell.indexOf("bash.exe") > -1 && windowsShell.indexOf("git") > -1) {
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            } else if (windowsShell && windowsShell.indexOf("powershell.exe") > -1) {
                return `cd "${cwd}"`; // PowerShell
            } else if (windowsShell && windowsShell.indexOf("cmd.exe") > -1) {
                return `cd /d "${cwd}"`; // CMD
            } else {
                return `cd "${cwd}"`; // Unknown, try using common one.
            }
        } else {
            return `cd "${cwd}"`;
        }
    }

    export function setupEnvironment(terminal: Terminal): void {
        // do this first so it can be overridden if desired
        setJavaHomeIfAvailable(terminal);

        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        }

        const environmentSettings: Array<EnvironmentSetting> = workspace.getConfiguration("maven").get("terminal.customEnv");
        environmentSettings.forEach(s => {
            terminal.sendText(getEnvironmentVariableCommand(s.environmentVariable, s.value), true);
        });
    }

    export function setJavaHomeIfAvailable(terminal: Terminal): void {
        const javaHome: string = workspace.getConfiguration("java").get<string>("home");
        const useJavaHome: boolean = workspace.getConfiguration("maven").get<boolean>("terminal.use.java.home");
        if (useJavaHome && javaHome) {
            terminal.sendText(getEnvironmentVariableCommand("JAVA_HOME", javaHome), true);
        }
    }

    export function getEnvironmentVariableCommand(variable: string, value: string): string {
        if (os.platform() === "win32") {
            const windowsShell: string = workspace.getConfiguration("terminal").get<string>("integrated.shell.windows")
                .toLowerCase();
            if (windowsShell && windowsShell.indexOf("bash.exe") > -1 && windowsShell.indexOf("git") > -1) {
                return `export ${variable}="${value}"`; // Git Bash
            } else if (windowsShell && windowsShell.indexOf("powershell.exe") > -1) {
                return `$Env:${variable}="${value}"`; // PowerShell
            } else if (windowsShell && windowsShell.indexOf("cmd.exe") > -1) {
                return `set ${variable}=${value}`; // CMD
            } else {
                return `set ${variable}=${value}`; // Unknown, try using common one.
            }
        } else {
            return `export ${variable}="${value}"`; // general linux
        }
    }

    export function onDidCloseTerminal(closedTerminal: Terminal): void {
        delete terminals[closedTerminal.name];
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
            window.showTextDocument(Uri.file(filepath), { preview: false });
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
                    description: (detailfunc && descfunc(item)),
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
