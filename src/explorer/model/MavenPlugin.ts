// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { mavenExplorerProvider } from "../MavenExplorerProvider";
import { pluginInfoProvider } from "../PluginInfoProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { PluginGoal } from "./PluginGoal";

const CONTEXT_VALUE: string = "MavenPlugin";

export class MavenPlugin implements ITreeItem {
    public project: MavenProject;
    public groupId: string;
    public artifactId: string;
    public version: string;

    public prefix: string;
    public goals: string[];

    constructor(project: MavenProject, groupId: string, artifactId: string, version?: string) {
        this.project = project;
        this.groupId = groupId;
        this.artifactId = artifactId;
        this.version = version;
        this.loadMetadata();
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        const label: string = this.prefix ? `${this.prefix} (${this.pluginId})` : this.pluginId;
        const treeItem: vscode.TreeItem = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        treeItem.iconPath = {
            light: Utils.getResourcePath("light/plug.svg"),
            dark: Utils.getResourcePath("dark/plug.svg")
        };
        return treeItem;
    }

    public async getChildren(): Promise<PluginGoal[]> {
        try {
            await this.loadMetadata();
        } catch (error) {
            return [];
        }
        return this.goals.map(goal => new PluginGoal(this, goal));
    }

    public removeChildren(): void {
        this.goals = undefined;
    }

    private async loadMetadata(): Promise<void> {
        if (this.prefix !== undefined && this.goals !== undefined) {
            return;
        }

        const { prefix, goals } = await pluginInfoProvider.getPluginInfo(this.project.pomPath, this.groupId, this.artifactId, this.version);
        this.prefix = prefix;
        this.goals = goals;
        mavenExplorerProvider.refresh(this);
    }

    private get pluginId(): string {
        let pluginId: string = `${this.groupId}:${this.artifactId}`;
        if (this.version !== undefined) {
            pluginId += `:${this.version}`;
        }
        return pluginId;
    }
}
