// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { TreeDataProvider } from "vscode";
import { MavenProjectManager } from "../project/MavenProjectManager";
import { Dependency } from "./model/Dependency";
import { ITreeItem } from "./model/ITreeItem";
import { MavenProject } from "./model/MavenProject";
import { PluginsMenu } from "./model/PluginsMenu";
import { WorkspaceFolder } from "./model/WorkspaceFolder";

export class MavenExplorerProvider implements TreeDataProvider<ITreeItem> {
    private static INSTANCE: MavenExplorerProvider;
    public static getInstance() {
        if (!this.INSTANCE) {
            this.INSTANCE = new MavenExplorerProvider();
        }
        return this.INSTANCE;
    }

    public readonly onDidChangeTreeData: vscode.Event<ITreeItem | undefined>;
    private _onDidChangeTreeData: vscode.EventEmitter<ITreeItem | undefined>;

    private constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter<ITreeItem>();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.refresh();
    }


    public updateProjects(...items: MavenProject[]): void {
        MavenProjectManager.update(...items);
    }

    public addProject(pomPath: string): void {
        MavenProjectManager.add(pomPath);
        this.refresh();
    }

    public removeProject(pomPath: string): void {
        MavenProjectManager.remove(pomPath);
        this.refresh();
    }

    public async addWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        await MavenProjectManager.loadProjects(folder);
        this.refresh();
    }

    public async removeWorkspaceFolder(folder: vscode.WorkspaceFolder): Promise<void> {
        await MavenProjectManager.removeAllFrom(folder);
        this.refresh();
    }

    public getTreeItem(element: ITreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return Promise.resolve(element.getTreeItem()).then(item => {
            item.contextValue = element.getContextValue();
            return item;
        });
    }
    public async getChildren(element?: ITreeItem): Promise<ITreeItem[] | undefined> {
        if (!vscode.workspace.isTrusted) {
            return undefined;
        }
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
    public async getParent(element: ITreeItem): Promise<ITreeItem | undefined> {
        if (element instanceof Dependency) {
            return element.parent;
        } else {
            return undefined;
        }
    }

    public refresh(item?: ITreeItem): void {
        if (item instanceof PluginsMenu) {
            (item as PluginsMenu).project.refreshEffectivePom().catch(console.error);
        }
        this._onDidChangeTreeData.fire(item);
    }
}
