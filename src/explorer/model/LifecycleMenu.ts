// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";
import { LifecyclePhase } from "./LifecyclePhase";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class LifecycleMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Lifecycle";
    }

    public async getChildren() : Promise<LifecyclePhase[]> {
        return ["clean", "validate", "compile", "test", "test-compile", "package", "verify", "install", "site", "deploy"].map(goal => new LifecyclePhase(this.project, goal));
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("sync");
        return treeItem;
    }
}
