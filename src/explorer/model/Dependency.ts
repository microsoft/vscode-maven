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
    private projectPomPath: string = "";
    private groupId: string = "";
    private artifactId: string = "";
    private version: string = "";
    private scope: string = "";
    constructor(value: string, projectPomPath: string) {
        super(value);
        const indexCut: number = value.indexOf("(");
        if (indexCut !== -1) {
            this.description = value.substr(indexCut);
            this.label = value.substr(0, indexCut);
        } else {
            this.label = value;
        }
        [this.groupId, this.artifactId, this.version, this.scope] = this.label.split(":");
        this.projectPomPath = projectPomPath;
    }

    public getContextValue(): string {
        return "Dependency";
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
