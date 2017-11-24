import * as fs from "fs";
import * as vscode from "vscode";

export class VSCodeUI {
    public static runInTerminal(command: string, addNewLine: boolean = true, terminal: string = "Maven"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        this.terminals[terminal].sendText(command, addNewLine);
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
