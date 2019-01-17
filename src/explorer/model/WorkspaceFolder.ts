// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { Settings } from "../../Settings";
import { Utils } from "../../utils/Utils";
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
        const newProjects: MavenProject[] = [];
        const allProjects: MavenProject[] = [];
        const pomPaths: string[] = await Utils.getAllPomPaths(this._workspaceFolder);
        for (const pomPath of pomPaths) {
            let currentProject: MavenProject = mavenExplorerProvider.getMavenProject(pomPath);
            if (!currentProject) {
                currentProject = new MavenProject(pomPath);
                newProjects.push(currentProject);
            }
            allProjects.push(currentProject);
        }

        await Promise.all(newProjects.map(elem => elem.parsePom()));
        mavenExplorerProvider.updateProjects(...newProjects);
        newProjects.forEach(p => {
            p.modules.forEach(m => {
                const moduleNode: MavenProject = mavenExplorerProvider.getMavenProject(m);
                if (moduleNode) {
                    moduleNode.parent = p;
                }
            });
        });

        if (allProjects.length === 0) {
            return [{
                getTreeItem: () => new vscode.TreeItem("No Maven project found."),
                getContextValue: () => "EmptyNode"
            }];
        }

        switch (Settings.viewType()) {
            case "hierarchical":
                return this.sortByName(allProjects.filter(m => !m.parent));
            case "flat":
                return this.sortByName(allProjects);
            default: return null;
        }
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this._workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private sortByName(arr: MavenProject[]): MavenProject[] {
        return arr.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });
    }
}
