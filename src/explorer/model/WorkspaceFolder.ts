// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

const CONTEXT_VALUE: string = "WorkspaceFolder";

export class WorkspaceFolder implements ITreeItem {
    private _workspaceFolder: vscode.WorkspaceFolder;
    private _pomPaths: string[];
    private _children: MavenProject[];

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this._workspaceFolder = workspaceFolder;
        this._children = [];
    }

    public get pomPaths(): string[] {
        return this._pomPaths;
    }

    public get children(): MavenProject[] {
        return this._children;
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getChildren(): Promise<ITreeItem[]> {
        await this._searchForPomPaths();
        this._children = [];

        for (const pomPath of this._pomPaths) {
            const projectNode: MavenProject = new MavenProject(pomPath);

            if (await projectNode.hasValidPom()) {
                this._children.push(projectNode);
            }
        }

        this._sortChildren();
        return this._children;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private async _searchForPomPaths(): Promise<void> {
        this._pomPaths = await Utils.getAllPomPaths(this._workspaceFolder);
    }

    private _sortChildren(): void {
        this._children.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });
    }
}
