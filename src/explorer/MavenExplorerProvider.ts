// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeDataProvider } from "vscode";
import * as vscode from "vscode";
import { ITreeItem } from "./model/ITreeItem";
import { MavenProject } from "./model/MavenProject";
import { WorkspaceFolder } from "./model/WorkspaceFolder";

export class MavenExplorerProvider implements TreeDataProvider<ITreeItem> {
    public readonly onDidChangeTreeData: vscode.Event<ITreeItem>;
    private _onDidChangeTreeData: vscode.EventEmitter<ITreeItem>;

    private _workspaceFolderNodes: WorkspaceFolder[];

    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<ITreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.refresh();
    }

    public get mavenProjectNodes(): MavenProject[] {
        return Array.prototype.concat.apply([], this._workspaceFolderNodes.map(ws => ws.children));
    }

    public getTreeItem(element: ITreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.getTreeItem();
    }
    public getChildren(element?: ITreeItem): vscode.ProviderResult<ITreeItem[]> {
        if (element === undefined) {
            return this._workspaceFolderNodes;
        } else {
            return element.getChildren();
        }
    }

    public refresh(): void {
        this._updateWorkspaceFolderNodes();
        this._onDidChangeTreeData.fire();
    }

    private _updateWorkspaceFolderNodes(): void {
        this._workspaceFolderNodes = vscode.workspace.workspaceFolders ?
            vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolder(workspaceFolder)) :
            [];
    }
}
