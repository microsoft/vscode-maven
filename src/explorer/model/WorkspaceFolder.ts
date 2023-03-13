// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";
import { MavenProjectManager } from "../../project/MavenProjectManager";
import { Settings } from "../../Settings";
import { HintNode } from "./HintNode";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
// import { ProfilesMenu } from "./ProfilesMenu";

const CONTEXT_VALUE = "maven:workspaceFolder";

export class WorkspaceFolder implements ITreeItem {
    constructor(
        public workspaceFolder: vscode.WorkspaceFolder,
    ) { }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getChildren(): Promise<ITreeItem[]> {
        const ret: ITreeItem[] = []; // TODO: show profiles menu when available
        // const ret: ITreeItem[] = [new ProfilesMenu()];
        const allProjects: MavenProject[] = await MavenProjectManager.loadProjects(this.workspaceFolder);
        if (allProjects.length === 0) {
            return [new HintNode("No Maven project found.")];
        }

        switch (Settings.viewType()) {
            case "hierarchical":
                ret.push(...this.sortByName(allProjects.filter(m => !m.parent)));
            case "flat":
                ret.push(...this.sortByName(allProjects));
            default:
        }
        return ret;
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return new vscode.TreeItem(this.workspaceFolder.name, TreeItemCollapsibleState.Expanded);
    }

    private sortByName(arr: MavenProject[]): MavenProject[] {
        return arr.sort((a, b) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
        });
    }
}
