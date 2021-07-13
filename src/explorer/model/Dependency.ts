// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { join } from "lodash";
import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { TreeNode } from "./TreeNode";

const DUPLICATE_INDICATOR: string = "omitted for duplicate";
const CONFLICT_INDICATOR: string = "omitted for conflict";

export class Dependency extends TreeNode implements ITreeItem {
    private fullArtifactName: string = ""; // groupId:artifactId:version:scope
    private projectPomPath: string;
    private gid: string;
    private aid: string;
    private version: string;
    private scope: string;
    private supplement: string = "";
    constructor(gid: string, aid: string, version: string, scope: string, supplement: string, projectPomPath: string) {
        super();
        this.gid = gid;
        this.aid = aid;
        this.version = version;
        this.scope = scope;
        this.fullArtifactName = join([gid, aid, version, scope], ":");
        this.supplement = supplement;
        this.projectPomPath = projectPomPath;
    }

    public get ProjectPomPath(): string {
        return this.projectPomPath;
    }
    public get fullName(): string {
        return this.fullArtifactName;
    }

    public get groupId(): string {
        return this.gid;
    }

    public get artifactId(): string {
        return this.aid;
    }
    public get Version(): string {
        return this.version;
    }
    public get Scope(): string {
        return this.scope;
    }

    public getContextValue(): string {
        return "Dependency";
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(<Dependency[]> this.children);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.fullArtifactName);
        if (this.children.length !== 0) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }

        if (this.supplement.indexOf(DUPLICATE_INDICATOR) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("trash");
            treeItem.description = this.supplement;
        } else if (this.supplement.indexOf(CONFLICT_INDICATOR) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("warning");
            treeItem.description = this.supplement;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        }
        return treeItem;
    }
}
