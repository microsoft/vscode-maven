// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

const CONTEXT_VALUE: string = "Menu";

export abstract class Menu implements ITreeItem {
    protected _projectNode: MavenProject;
    protected _name: string;

    constructor(projectNode: MavenProject) {
        this._projectNode = projectNode;
    }

    public abstract getChildren(): vscode.ProviderResult<ITreeItem[]>;

    public getContextValue(): string {
        return CONTEXT_VALUE;
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
