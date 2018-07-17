// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { Utils } from "../../Utils";
import { MavenProjectNode } from "./MavenProjectNode";
import { NodeBase } from "./NodeBase";

export class WorkspaceFolderNode extends NodeBase {
    private _workspaceFolder: vscode.WorkspaceFolder;
    private _pomPaths: string[];
    private _children: MavenProjectNode[];

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        super();
        this._workspaceFolder = workspaceFolder;
    }

    public get pomPaths(): string[] {
        return this._pomPaths;
    }

    public get children(): MavenProjectNode[] {
        return this._children;
    }

    public async getChildren(): Promise<NodeBase[]> {
        await this._searchForPomPaths();
        this._children = this._pomPaths.map(pomPath => new MavenProjectNode(pomPath));
        return this._children;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private async _searchForPomPaths(): Promise<void> {
        this._pomPaths = await Utils.getAllPomPaths(this._workspaceFolder);
    }
}
