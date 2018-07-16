import * as vscode from "vscode";
import { NodeBase } from "./NodeBase";
import { Utils } from "../../Utils";
import { workspace, TreeItemCollapsibleState } from "vscode";
import { MavenProjectNode } from "./MavenProjectNode";

export class WorkspaceFolderNode extends NodeBase {
    private _workspaceFolder: vscode.WorkspaceFolder;
    private _pomPaths: string[];

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        super();
        this._workspaceFolder = workspaceFolder;
    }

    public get pomPaths(): string[] {
        return this._pomPaths;
    }

    public async getChildren(): Promise<NodeBase[]> {
        await this._searchForPomPaths();
        return this._pomPaths.map(pomPath => new MavenProjectNode(pomPath));
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private async _searchForPomPaths(): Promise<void> {
        const depth: number = workspace.getConfiguration("maven.projects").get<number>("maxDepthOfPom");
        const exclusions: string[] = workspace.getConfiguration("maven.projects", this._workspaceFolder.uri).get<string[]>("excludedFolders");
        this._pomPaths = await Utils.findAllInDir(this._workspaceFolder.uri.fsPath, "pom.xml", depth, exclusions);
        return;
    }
}
