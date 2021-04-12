// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeDataProvider } from "vscode";
import * as vscode from "vscode";
import { Utils } from "../utils/Utils";
import { ITreeItem } from "./model/ITreeItem";
import { MavenProject } from "./model/MavenProject";
import { WorkspaceFolder } from "./model/WorkspaceFolder";

class MavenExplorerProvider implements TreeDataProvider<ITreeItem> {
    public readonly onDidChangeTreeData: vscode.Event<ITreeItem>;

    private _onDidChangeTreeData: vscode.EventEmitter<ITreeItem>;
    private _projectMap: Map<string, MavenProject> = new Map();

    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<ITreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.refresh();
    }

    public get mavenProjectNodes(): MavenProject[] {
        return Array.from(this._projectMap.values());
    }

    public updateProjects(...items: MavenProject[]): void {
        for (const item of items) {
            this._projectMap.set(item.pomPath, item);
        }
    }

    public addProject(pomPath: string): void {
        this._projectMap.set(pomPath, new MavenProject(pomPath));
        this.refresh();
    }

    public removeProject(pomPath: string): void {
        if (this._projectMap.has(pomPath)) {
            this._projectMap.delete(pomPath);
            this.refresh();
        }
    }

    public async addWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        await this.loadProjects(folder);
        this.refresh();
    }

    public async removeWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        const pomPaths: string[] = await Utils.getAllPomPaths(folder);
        for (const pomPath of pomPaths) {
            this._projectMap.delete(pomPath);
        }
        this.refresh();
    }

    public getMavenProject(pomPath: string): MavenProject | undefined {
        return this._projectMap.get(pomPath);
    }
    public getTreeItem(element: ITreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return Promise.resolve(element.getTreeItem()).then(item => {
            item.contextValue = element.getContextValue();
            return item;
        });
    }
    public async getChildren(element?: ITreeItem): Promise<ITreeItem[] | undefined> {
        if (element === undefined) {
            if (!vscode.workspace.workspaceFolders) {
                return undefined;
            }
            if (vscode.workspace.workspaceFolders.length === 1) {
                return await new WorkspaceFolder(vscode.workspace.workspaceFolders[0]).getChildren();
            }
            return vscode.workspace.workspaceFolders.map(workspaceFolder => new WorkspaceFolder(workspaceFolder));
        } else {
            return element.getChildren ? element.getChildren() : undefined;
        }
    }

    public refresh(item?: ITreeItem): void {
        this._onDidChangeTreeData.fire(item);
    }

    public async loadProjects(workspaceFolder?: vscode.WorkspaceFolder): Promise<MavenProject[]> {
        const newProjects: MavenProject[] = [];
        const allProjects: MavenProject[] = [];
        const pomPaths: string[] = await Utils.getAllPomPaths(workspaceFolder);

        for (const pomPath of pomPaths) {
            let currentProject: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
            if (!currentProject) {
                currentProject = new MavenProject(pomPath);
                newProjects.push(currentProject);
            }
            allProjects.push(currentProject);
        }

        await Promise.all(newProjects.map(async elem => elem.parsePom()));
        mavenExplorerProvider.updateProjects(...newProjects);
        newProjects.forEach(p => {
            p.modules.forEach(m => {
                const moduleNode: MavenProject | undefined = mavenExplorerProvider.getMavenProject(m);
                if (moduleNode && moduleNode.parent === undefined) {
                    moduleNode.parent = p;
                }
            });
        });
        return allProjects;
    }

}

// tslint:disable-next-line:export-name
export const mavenExplorerProvider: MavenExplorerProvider = new MavenExplorerProvider();
