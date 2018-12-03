// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Utils } from "../../Utils";
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
    }

    public async getGoals(): Promise<string[]> {
        await this.loadMetadata();
        return this.goals;
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        return new vscode.TreeItem(`${this.prefix}(${this.pluginId})`, vscode.TreeItemCollapsibleState.Collapsed);
    }

    public async getChildren(): Promise<PluginGoal[]> {
        await this.loadMetadata();
        return this.goals.map(goal => new PluginGoal(goal));
    }

    private async loadMetadata(): Promise<void> {
        if (this.prefix !== undefined && this.goals !== undefined) {
            return;
        }

        const rawOutput: string = await Utils.executeInBackground(`help:describe -Dplugin=${this.pluginId}`, this.project.pomPath);
        // find version
        if (this.version === undefined) {
            const versionRegExp: RegExp = /^Version: (.*)/m;
            const versionMatch: string[] = rawOutput.match(versionRegExp);
            if (versionMatch && versionMatch.length === 2) {
                this.version = versionMatch[1];
            }
        }

        // find prefix
        const prefixRegExp: RegExp = /^Goal Prefix: (.*)/m;
        const prefixMatch: string[] = rawOutput.match(prefixRegExp);
        if (prefixMatch && prefixMatch.length === 2) {
            this.prefix = prefixMatch[1];
        }

        // find goals
        if (this.version && this.prefix) {
            const goalRegExp: RegExp = new RegExp(`^${this.prefix}:(.*)`, "gm");
            const goals: string[] = rawOutput.match(goalRegExp);
            if (goals) {
                this.goals = goals || [];
            }
        } else {
            this.goals = [];
        }
    }

    private get pluginId(): string {
        let pluginId: string = `${this.groupId}:${this.artifactId}`;
        if (this.version !== undefined) {
            pluginId += `:${this.version}`;
        }
        return pluginId;
    }
}
