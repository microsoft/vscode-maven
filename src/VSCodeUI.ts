import * as fs from "fs-extra";
import * as os from "os";
import { OpenDialogOptions, QuickPickItem, Terminal, Uri, window, workspace, WorkspaceConfiguration } from "vscode";

export namespace VSCodeUI {
    const terminals: { [id: string]: Terminal } = {};

    export function runInTerminal(command: string, options?: ITerminalOptions): void {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (terminals[name] === undefined) {
            terminals[name] = window.createTerminal({ name });
        }
        terminals[name].show();
        if (cwd) {
            terminals[name].sendText(getCDCommand(cwd), true);
        }
        terminals[name].sendText(command, addNewLine);
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

    export async function openDialogForFile(customOptions: OpenDialogOptions): Promise<Uri> {
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
        items: T[],
        labelfunc: (item: T) => string, descfunc: (item: T) => string,
        detailfunc?: (item: T) => string
    ): Promise<T> {
        const itemWrappers: IQuickPickItemEx<T>[] = [];
        items.forEach((item: T) => {
            const wrapper: IQuickPickItemEx<T> = {
                description: descfunc(item),
                detail: (detailfunc && detailfunc(item)),
                label: labelfunc(item),
                value: item
            };
            itemWrappers.push(wrapper);
        });
        const selected: IQuickPickItemEx<T> = await window.showQuickPick(itemWrappers);
        return selected && selected.value;
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
