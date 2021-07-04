// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { parseDependency } from "./DependenciesMenu";
import { ITreeItem } from "./ITreeItem";
import { TreeNode } from "./TreeNode";

const DUPLICATE_INDICATOR: string = "omitted for duplicate";
const CONFLICT_INDICATOR: string = "omitted for conflict";

export class Dependency implements ITreeItem {
    private treeNode: TreeNode;
    private label: string = "";
    private description: string = "";
    private groupId: string = "";
    private artifactId: string = "";
    private version: string = "";
    private scope: string = "";
    constructor(treeNode: TreeNode) {
        this.treeNode = treeNode;
        const dependency: string = treeNode.value;
        const indexCut: number = dependency.indexOf("(");
        if (indexCut !== -1) {
            this.description = dependency.substr(indexCut);
            this.label = dependency.substr(0, indexCut);
        } else {
            this.label = dependency;
        }
        [this.groupId, this.artifactId, this.version, this.scope] = this.label.split(":");
    }

    public getContextValue(): string {
        return "Dependencies";
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(parseDependency(this.treeNode));
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        //highlight for conflict and description for duplicate
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.label);
        if (this.treeNode.children.length !== 0) {
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
