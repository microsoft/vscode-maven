import * as vscode from "vscode";
import { MavenProject } from "./MavenProject";
import { NodeBase } from "./NodeBase";

export class MavenProjectNode extends NodeBase {
    private _mavenProject: MavenProject;

    constructor(pomPath: string) {
        super();
        this._mavenProject = new MavenProject(pomPath);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._mavenProject.name);
        treeItem.iconPath = {
            light: "",
            dark: ""
        };
        return treeItem;

    }

    public getChildren(): vscode.ProviderResult<NodeBase[]> {
        return [];
    }
}