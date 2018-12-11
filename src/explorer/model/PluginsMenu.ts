// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class PluginsMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this._name = "Plugins";
    }

    public getChildren() : MavenPlugin[] {
        return this._project.plugins;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: Utils.getResourcePath("light", "pluginMenu.svg"),
            dark: Utils.getResourcePath("dark", "pluginMenu.svg")
        };
        return treeItem;
    }

    public async refresh(): Promise<void> {
        await this._project.calculateEffectivePom(true);
    }
}
