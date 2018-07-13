import { TreeDataProvider } from "vscode";
import * as vscode from "vscode";
import { NodeBase } from "./model/NodeBase";
import { WorkspaceFolderNode } from "./model/WorkspaceFolderNode";

export class MavenExplorerProvider implements TreeDataProvider<NodeBase> {
    public readonly onDidChangeTreeData: vscode.Event<NodeBase>;
    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase>;

    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<NodeBase>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }
    public getTreeItem(element: NodeBase): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }
    public getChildren(element?: NodeBase): vscode.ProviderResult<NodeBase[]> {
        if (element === undefined) {
            return vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolderNode(workspaceFolder));
        } else {
            return element.getChildren();
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}
