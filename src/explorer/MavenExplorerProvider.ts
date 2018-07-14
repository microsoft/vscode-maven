import { TreeDataProvider } from "vscode";
import * as vscode from "vscode";
import { NodeBase } from "./model/NodeBase";
import { WorkspaceFolderNode } from "./model/WorkspaceFolderNode";
import { Utils } from "../Utils";

export class MavenExplorerProvider implements TreeDataProvider<NodeBase> {
    public readonly onDidChangeTreeData: vscode.Event<NodeBase>;
    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase>;

    private _workspaceFolderNodes: WorkspaceFolderNode[];

    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<NodeBase>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.refresh();
    }

    public getTreeItem(element: NodeBase): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }
    public getChildren(element?: NodeBase): vscode.ProviderResult<NodeBase[]> {
        if (element === undefined) {
            return this._workspaceFolderNodes;
        } else {
            return element.getChildren();
        }
    }

    public async refresh(): Promise<void> {
        this._updateWorkspaceFolderNodes();
        Utils.enableMavenProjectExplorer(await this._hasPomInWorkspace());
        this._onDidChangeTreeData.fire();
    }

    private _updateWorkspaceFolderNodes(): void {
        this._workspaceFolderNodes = vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolderNode(workspaceFolder));
    }
    private async _hasPomInWorkspace(): Promise<boolean> {
        const allPomPaths: string[] = [].concat.apply([], await Promise.all(this._workspaceFolderNodes.map(node => node.getPomPaths())));
        return allPomPaths.length > 0;
    }
}
