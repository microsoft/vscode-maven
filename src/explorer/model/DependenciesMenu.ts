// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { parseRawDependencyDataHandler } from "../../handlers/parseRawDependencyDataHandler";
import { Dependency } from "./Dependency";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class DependenciesMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Dependencies";
    }

    public async getChildren() : Promise<Dependency[]> {
        const treeNodes = await parseRawDependencyDataHandler(this.project);
        return Promise.resolve(treeNodes);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("library");
        return treeItem;
    }
}
