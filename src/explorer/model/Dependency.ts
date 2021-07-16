// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { TreeNode } from "./TreeNode";

const DUPLICATE_INDICATOR: string = "omitted for duplicate";
const CONFLICT_INDICATOR: string = "omitted for conflict";

export class Dependency extends TreeNode implements ITreeItem {
    private fullArtifactName: string = ""; // groupId:artifactId:version:scope
    private _projectPomPath: string;
    private _fullDependencyText: string;
    private _gid: string;
    private _aid: string;
    private _version: string;
    private _scope: string;
    private supplement: string = "";
    constructor(gid: string, aid: string, version: string, scope: string, supplement: string, projectPomPath: string, fullDependencyText: string) {
        super();
        this._gid = gid;
        this._aid = aid;
        this._version = version;
        this._scope = scope;
        this.fullArtifactName = [gid, aid, version, scope].join(":");
        this.supplement = supplement;
        this._projectPomPath = projectPomPath;
        this._fullDependencyText = fullDependencyText;
    }

    public get fullDependencyText(): string {
        return this._fullDependencyText;
    }

    public get projectPomPath(): string {
        return this._projectPomPath;
    }
    public get fullName(): string {
        return this.fullArtifactName;
    }

    public get groupId(): string {
        return this._gid;
    }

    public get artifactId(): string {
        return this._aid;
    }
    public get version(): string {
        return this._version;
    }
    public get scope(): string {
        return this._scope;
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
