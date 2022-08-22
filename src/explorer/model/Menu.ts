// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

const CONTEXT_VALUE: string = "maven:menu";

export abstract class Menu implements ITreeItem {
    protected name: string;

    constructor(
        public project: MavenProject,
    ) { }

    public abstract getChildren(): ITreeItem[] | undefined | Promise<ITreeItem[] | undefined>;

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("folder");
        return treeItem;
    }
}
