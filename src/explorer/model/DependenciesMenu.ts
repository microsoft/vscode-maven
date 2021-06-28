// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getDependencyTree } from "../../handlers/showDependenciesHandler";
import { Dependencies } from "./Dependencies";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class DependenciesMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Dependencies";
    }

    public async getChildren() : Promise<Dependencies[]> {
        const dependencyTree: string | undefined = await getDependencyTree( this.project.pomPath);
        if (dependencyTree === undefined) {
            throw new Error("Failed to generate dependency tree.");
        }
        let treeContent: string = dependencyTree.slice(0, -1); //delete last "\n"
        treeContent = treeContent.replace(/\|/g, " ");
        treeContent = treeContent.replace(/\\/g, "+");
        treeContent = treeContent.replace(/\n/g, "\r\n");
        return Promise.resolve(this.getDepsInString(treeContent));
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = new vscode.ThemeIcon("library");
        return treeItem;
    }

    private getDepsInString(treecontent: string): Dependencies[] {
        if (treecontent) {
            const treeChildren: string[] = treecontent.split(`\r\n+-`).splice(1); // delete first line
            const toDep = (treeChild: string): Dependencies => {
                if (treeChild.indexOf("\r\n") === -1) {
                    return new Dependencies(treeChild, "\r\n", vscode.TreeItemCollapsibleState.None, this.project.pomPath);
                } else {
                    return new Dependencies(treeChild, "\r\n", vscode.TreeItemCollapsibleState.Collapsed, this.project.pomPath);
                }
            };
            return treeChildren.map(toDep);
        } else {
            return [];
        }
    }
}
