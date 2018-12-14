// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { taskExecutor } from "../../taskExecutor";
import { Utils } from "../../Utils";
import { mavenExplorerProvider } from "../mavenExplorerProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";

const CONTEXT_VALUE: string = "WorkspaceFolder";

export class WorkspaceFolder implements ITreeItem {
    private _workspaceFolder: vscode.WorkspaceFolder;

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this._workspaceFolder = workspaceFolder;
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getChildren(): Promise<ITreeItem[]> {
        const children: MavenProject[] = [];

        for (const pomPath of await Utils.getAllPomPaths(this._workspaceFolder)) {
            const projectNode: MavenProject = mavenExplorerProvider.getMavenProject(pomPath) || new MavenProject(pomPath);
            children.push(projectNode);
        }
        mavenExplorerProvider.updateProjects(...children);
        await Promise.all(children.map(elem => elem.parsePom()));
        this.sortByName(children);
        children.forEach(element => {
            taskExecutor.execute(async () => await element.calculateEffectivePom());
        });
        return children;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private sortByName(arr: MavenProject[]): void {
        arr.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });
    }
}
