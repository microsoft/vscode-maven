
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

export class LifecycleItem implements ITreeItem {
    constructor(public project: MavenProject, public goal: string) {
    }

    public getContextValue(): string {
        return "Lifecycle";
    }
    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.goal, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon("gear");
        return treeItem;
    }
}
