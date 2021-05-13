import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
export class UntrustedWorkspaceHint implements ITreeItem {
    private text: string = "Features disabled in untrusted workspaces";
    private codicon: string = "info";
    private command: string = "workbench.action.manageTrust";

    public getChildren(): undefined {
        return undefined;
    }

    public getContextValue(): string {
        return "PlainText";
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const item = new vscode.TreeItem(this.text, vscode.TreeItemCollapsibleState.None);
        item.iconPath = new vscode.ThemeIcon(this.codicon);
        item.command = {
            command: this.command,
            title: "Manage Workspace Trust"
        };
        return item;
    }
}
