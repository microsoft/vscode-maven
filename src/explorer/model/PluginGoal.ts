// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";

export class PluginGoal implements ITreeItem {
    public name: string;
    constructor(name: string) {
        this.name = name;
    }

    public getContextValue(): string {
        return "PluginGoal";
    }
    public getTreeItem(): vscode.TreeItem {
        return new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.None);
    }
    public getChildren(): ITreeItem[] {
        return null;
    }

}
