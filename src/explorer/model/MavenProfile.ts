// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

export class MavenProfile implements ITreeItem {
    constructor(
        public project: MavenProject,
        public id: string,
        public active: boolean,
        public source: string,
    ) { }

    public selected: boolean | undefined;

    public getContextValue(): string {
        if (this.checked()) {
            return "maven:profile+checked";
        } else {
            return "maven:profile+unchecked";
        }
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.id, vscode.TreeItemCollapsibleState.None);
        if (this.checked()) {
            treeItem.iconPath = new vscode.ThemeIcon("check");

        }
        return treeItem;
    }

    private checked(): boolean {
        if (this.selected === undefined) {
            return this.active;
        } else {
            return this.selected;
        }
    }
}