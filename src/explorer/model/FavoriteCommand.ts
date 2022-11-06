// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItem } from "vscode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

export class FavoriteCommand implements ITreeItem {
    
    constructor(public project: MavenProject, public command: string, public alias: string, public debug?: boolean) {}

    getContextValue(): string {
        return "maven:favorites";
    }

    getTreeItem(): TreeItem | Thenable<TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.alias, vscode.TreeItemCollapsibleState.None);
        treeItem.iconPath = new vscode.ThemeIcon("gear");
        return treeItem;
    }
    
}
