// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { mavenExplorerProvider } from "../mavenExplorerProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class PluginsMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this._name = "Plugins";
    }

    public async getChildren() : Promise<MavenPlugin[]> {
        await this._project.calculateEffectivePom();
        return this._project.plugins;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: getPathToExtensionRoot("resources", "icons", "light", "extensions.svg"),
            dark: getPathToExtensionRoot("resources", "icons", "dark", "extensions.svg")
        };
        return treeItem;
    }

    public async refresh(): Promise<void> {
        this._project.effectivePom.upToDate = false;
        mavenExplorerProvider.refresh(this);
    }
}
