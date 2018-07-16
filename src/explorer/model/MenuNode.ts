import { NodeBase } from "./NodeBase";
import * as vscode from "vscode";
import { MavenProjectNode } from "./MavenProjectNode";
import { Utils } from "../../Utils";

export abstract class MenuNode extends NodeBase {
    protected _projectNode: MavenProjectNode;
    protected _name: string;

    constructor(projectNode: MavenProjectNode) {
        super();
        this._projectNode  = projectNode;
    }
    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: Utils.getResourcePath("light", "folder.svg"),
            dark: Utils.getResourcePath("dark", "folder.svg"),
        };
        return treeItem;
    }
}
