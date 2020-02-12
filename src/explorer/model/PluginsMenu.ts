// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenExplorerProvider } from "../mavenExplorerProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class PluginsMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Plugins";
    }

    public async getChildren() : Promise<MavenPlugin[]> {
        await this.project.getEffectivePom();
        return this.project.plugins;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("extensions");
        return treeItem;
    }

    public async refresh(): Promise<void> {
        this.project.refreshEffectivePom().catch(console.error);
        mavenExplorerProvider.refresh(this);
    }
}
