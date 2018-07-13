import * as vscode from "vscode";
export abstract class NodeBase {
    public abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
    public abstract getChildren(): vscode.ProviderResult<NodeBase[]>;
}
