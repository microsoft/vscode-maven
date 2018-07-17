// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeDataProvider } from "vscode";
import * as vscode from "vscode";
import { MavenProjectNode } from "./model/MavenProjectNode";
import { NodeBase } from "./model/NodeBase";
import { WorkspaceFolderNode } from "./model/WorkspaceFolderNode";

export class MavenExplorerProvider implements TreeDataProvider<NodeBase> {
    public readonly onDidChangeTreeData: vscode.Event<NodeBase>;
    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase>;

    private _workspaceFolderNodes: WorkspaceFolderNode[];

    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<NodeBase>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;

        this.refresh();
    }

    public get mavenProjectNodes(): MavenProjectNode[] {
        return Array.prototype.concat.apply([], this._workspaceFolderNodes.map(ws => ws.children));
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

    public refresh(): void {
        this._updateWorkspaceFolderNodes();
        this._onDidChangeTreeData.fire();
    }

    private _updateWorkspaceFolderNodes(): void {
        this._workspaceFolderNodes = vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolderNode(workspaceFolder));
    }
}
