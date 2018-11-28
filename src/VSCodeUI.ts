// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as vscode from "vscode";
import { InputBoxOptions, OpenDialogOptions, OutputChannel, QuickPickItem, QuickPickOptions, Terminal, Uri, window } from "vscode";
import { Settings } from "./Settings";
import { Utils } from "./Utils";

export namespace VSCodeUI {
    const TROUBLESHOOTING_LINK: string = "https://github.com/Microsoft/vscode-maven/blob/master/Troubleshooting.md";

    // output channel
    class MavenOutputChannel {
        private readonly channel: OutputChannel = window.createOutputChannel("Maven for Java");

        public appendLine(message: any, title?: string): void {
            if (title) {
                const simplifiedTime: string = (new Date()).toISOString().replace(/z|t/gi, " ").trim(); // YYYY-MM-DD HH:mm:ss.sss
                const hightlightingTitle: string = `[${title} ${simplifiedTime}]`;
                this.channel.appendLine(hightlightingTitle);
            }
            this.channel.appendLine(message);
        }

        public append(message: any): void {
            this.channel.append(message);
        }

        public show(): void {
            this.channel.show();
        }
    }

    export const outputChannel: MavenOutputChannel = new MavenOutputChannel();

    // terminal
    class MavenTerminal {
        private readonly terminals: { [id: string]: Terminal } = {};

        public runInTerminal(command: string, options?: ITerminalOptions): void {
            const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
            const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
            if (this.terminals[name] === undefined) {
                this.terminals[name] = window.createTerminal({ name });
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

        public onDidCloseTerminal(closedTerminal: Terminal): void {
            try {
                delete this.terminals[closedTerminal.name];
            } catch (error) {
                // ignore it.
            }
        }
    }

    export const mavenTerminal: MavenTerminal = new MavenTerminal();

    function getCommand(cmd: string): string {
        if (process.platform === "win32") {
            switch (Utils.currentWindowsShell()) {
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

        const environmentSettings: EnvironmentSetting[] = Settings.Terminal.customEnv();
        environmentSettings.forEach((s: EnvironmentSetting) => {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand(s.environmentVariable, s.value), true);
            }
            customEnv[s.environmentVariable] = s.value;
        });
        return customEnv;
    }

    function setJavaHomeIfAvailable(terminal?: Terminal): {} {
        // Look for the java.home setting from the redhat.java extension.  We can reuse it
        // if it exists to avoid making the user configure it in two places.
        const javaHome: string = Settings.External.javaHome();
        const useJavaHome: boolean = Settings.Terminal.useJavaHome();
        if (useJavaHome && javaHome) {
            if (terminal) {
                terminal.sendText(composeSetEnvironmentVariableCommand("JAVA_HOME", javaHome), true);
            }
            return { JAVA_HOME: javaHome };
        } else {
            return {};
        }
    }

    function composeSetEnvironmentVariableCommand(variable: string, value: string): string {
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

    // file chooser dialog
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

    // editor
    export async function openFileIfExists(filepath: string): Promise<void> {
        if (await fs.pathExists(filepath)) {
            window.showTextDocument(Uri.file(filepath));
        }
    }

    // Quick pick
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

    // Inputbox
    export async function getFromInputBox(options?: InputBoxOptions): Promise<string> {
        return await window.showInputBox(Object.assign({ ignoreFocusOut: true }, options));

    }

    // Troubleshooting
    export async function showTroubleshootingDialog(errorMessage: string): Promise<void> {
        const OPTION_LEARN_MORE: string = "Learn more";
        const choiceForDetails: string = await window.showErrorMessage(errorMessage, OPTION_LEARN_MORE);
        if (choiceForDetails === OPTION_LEARN_MORE) {
            // open FAQs
            vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(TROUBLESHOOTING_LINK));
        }
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
