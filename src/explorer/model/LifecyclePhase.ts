
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

export class LifecyclePhase implements ITreeItem {
    constructor(public project: MavenProject, public phase: string) {
    }

    public getContextValue(): string {
        return "maven:lifecycle";
    }
    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.phase, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon("gear");
        return treeItem;
    }
}
