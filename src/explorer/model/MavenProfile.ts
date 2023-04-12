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

    public getTreeItem(): vscode.TreeItem2 | Thenable<vscode.TreeItem2> {
        const treeItem: vscode.TreeItem2 = new vscode.TreeItem2(this.id, vscode.TreeItemCollapsibleState.None);
        if (this.checked()) {
            treeItem.checkboxState = vscode.TreeItemCheckboxState.Checked;
            // treeItem.iconPath = new vscode.ThemeIcon("check");
        } else {
            treeItem.checkboxState = vscode.TreeItemCheckboxState.Unchecked;
            // no icon
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