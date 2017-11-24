import * as fs from "fs";
import * as os from "os";
import * as vscode from "vscode";

export class VSCodeUI {
    public static runInTerminal(command: string, options?: ITerminalOptions): void {
        const defaultOptions: ITerminalOptions = { addNewLine: true, name: "Maven" };
        const { addNewLine, name, cwd } = Object.assign(defaultOptions, options);
        if (this.terminals[name] === undefined) {
            this.terminals[name] = vscode.window.createTerminal({ name });
        }
        this.terminals[name].show();
        if (cwd) {
            this.terminals[name].sendText(this.getCDCommand(cwd), true);
        }
        this.terminals[name].sendText(command, addNewLine);
    }

    public static getCDCommand(cwd: string): string {
        if (os.platform() === "win32") {
            const windowsShell = vscode.workspace.getConfiguration("terminal").get<string>("integrated.shell.windows")
                .toLowerCase();
            if (windowsShell && windowsShell.indexOf("bash.exe") > -1 && windowsShell.indexOf("git") > -1) {
                return `cd "${cwd.replace(/\\+$/, "")}"`; // Git Bash: remove trailing '\'
            } else if (windowsShell && windowsShell.indexOf("powershell.exe") > -1) {
                return `cd "${cwd}"`; // PowerShell
            } else if (windowsShell && windowsShell.indexOf("cmd.exe") > -1) {
                return `cd /d "${cwd}"`; // CMD
            }
        } else {
            return `cd "${cwd}"`;
        }
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static async openDialogForFolder(customOptions: vscode.OpenDialogOptions): Promise<vscode.Uri> {
        const options = {
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
        };
        const result = await vscode.window.showOpenDialog(Object.assign(options, customOptions));
        if (result && result.length) {
            return Promise.resolve(result[0]);
        } else {
            return Promise.resolve(null);
        }
    }

    public static openFileIfExists(filepath: string) {
        if (fs.existsSync(filepath)) {
            vscode.window.showTextDocument(vscode.Uri.file(filepath), { preview: false });
        }
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};
}

interface ITerminalOptions {
    addNewLine?: boolean;
    name?: string;
    cwd?: string;
}
