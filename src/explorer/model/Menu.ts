// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

const CONTEXT_VALUE: string = "Menu";

export abstract class Menu implements ITreeItem {
    protected _project: MavenProject;
    protected _name: string;

    constructor(project: MavenProject) {
        this._project = project;
    }

    public abstract getChildren(): vscode.ProviderResult<ITreeItem[]>;

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: getPathToExtensionRoot("resources", "light", "folder.svg"),
            dark: getPathToExtensionRoot("resources", "dark", "folder.svg")
        };
        return treeItem;
    }
}
