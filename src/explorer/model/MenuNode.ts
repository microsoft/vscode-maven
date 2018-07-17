// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { MavenProjectNode } from "./MavenProjectNode";
import { NodeBase } from "./NodeBase";

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
            dark: Utils.getResourcePath("dark", "folder.svg")
        };
        return treeItem;
    }
}
