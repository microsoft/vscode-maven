// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
// import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";

export class PluginGoal implements ITreeItem {
    public plugin: MavenPlugin;
    public name: string;

    constructor(plugin: MavenPlugin, name: string) {
        this.plugin = plugin;
        this.name = name;
    }

    public getContextValue(): string {
        return "PluginGoal";
    }
    public getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.None);
        // const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.None);
        // treeItem.iconPath = {
        //     light: Utils.getResourcePath("light", "goal.svg"),
        //     dark: Utils.getResourcePath("dark", "goal.svg")
        // };
        // return treeItem;
    }
}
