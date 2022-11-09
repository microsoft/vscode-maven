// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Menu } from "./Menu";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { FavoriteCommand } from "./FavoriteCommand";
import { Settings } from "../../Settings";

export class FavoritesMenu extends Menu implements ITreeItem {

    constructor(project: MavenProject) {
        super(project);
        this.name = "Favorites";
    }

    public async getChildren(): Promise<FavoriteCommand[] | undefined> {
        return Settings.Terminal.favorites(this.project);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("star-empty");
        return treeItem;
    }
}