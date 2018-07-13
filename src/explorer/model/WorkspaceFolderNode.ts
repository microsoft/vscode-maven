import * as vscode from "vscode";
import { NodeBase } from "./NodeBase";

export class WorkspaceFolderNode extends NodeBase {
    private _workspaceFolder: vscode.WorkspaceFolder;

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        super();
        this._workspaceFolder = workspaceFolder;
    }

    public getChildren(): vscode.ProviderResult<NodeBase[]> {
        return [];
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name);
    }

}
