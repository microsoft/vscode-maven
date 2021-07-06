// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { TreeNode } from "./TreeNode";

const DUPLICATE_INDICATOR: string = "omitted for duplicate";
const CONFLICT_INDICATOR: string = "omitted for conflict";

export class Dependency extends TreeNode implements ITreeItem {
    private label: string = ""; // groupId:artifactId:version:scope
    private description: string = "";
    constructor(value: string) {
        super(value);
        const indexCut: number = value.indexOf("(");
        if (indexCut !== -1) {
            this.description = value.substr(indexCut);
            this.label = value.substr(0, indexCut);
        } else {
            this.label = value;
        }
    }

    public getContextValue(): string {
        return "Dependencies";
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(<Dependency[]> this.children);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.label);
        if (this.children.length !== 0) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }

        if (this.description.indexOf(DUPLICATE_INDICATOR) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("trash");
            treeItem.description = this.description;
        } else if (this.description.indexOf(CONFLICT_INDICATOR) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("warning");
            treeItem.description = this.description;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        }
        return treeItem;
    }
}
