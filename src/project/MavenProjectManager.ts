// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MavenProject } from "../explorer/model/MavenProject";
import * as vscode from "vscode";
import { Settings } from "../Settings";

export class MavenProjectManager {

    private static INSTANCE: MavenProjectManager;
    private _projectMap: Map<string, MavenProject> = new Map();

    private constructor() {
    }

    public static getInstance() {
        if (!this.INSTANCE) {
            this.INSTANCE = new MavenProjectManager();
        }
        return this.INSTANCE;
    }

    public static async loadProjects(workspaceFolder?: vscode.WorkspaceFolder): Promise<MavenProject[]> {
        const newProjects: MavenProject[] = [];
        const allProjects: MavenProject[] = [];
        const pomPaths: string[] = await getAllPomPaths(workspaceFolder);

        for (const pomPath of pomPaths) {
            let currentProject: MavenProject | undefined = MavenProjectManager.get(pomPath);
            if (!currentProject) {
                currentProject = new MavenProject(pomPath);
                newProjects.push(currentProject);
            }
            allProjects.push(currentProject);
        }

        await Promise.all(newProjects.map(async elem => elem.parsePom()));
        MavenProjectManager.update(...newProjects);
        newProjects.forEach(p => {
            p.modules.forEach(m => {
                const moduleNode: MavenProject | undefined = MavenProjectManager.get(m);
                if (moduleNode && moduleNode.parent === undefined) {
                    moduleNode.parent = p;
                }
            });
        });
        return allProjects;
    }

    public static get projects(): MavenProject[] {
        return Array.from(MavenProjectManager.getInstance()._projectMap.values());
    }

    public static get(pomPath: string): MavenProject | undefined {
        return MavenProjectManager.getInstance()._projectMap.get(pomPath);
    }

    public static update(...items: MavenProject[]): void {
        for (const item of items) {
            MavenProjectManager.getInstance()._projectMap.set(item.pomPath, item);
        }
    }

    public static add(pomPath: string): void {
        MavenProjectManager.getInstance()._projectMap.set(pomPath, new MavenProject(pomPath));
    }

    public static remove(pomPath: string): void {
        const projectMap = MavenProjectManager.getInstance()._projectMap;
        if (projectMap.has(pomPath)) {
            projectMap.delete(pomPath);
        }
    }

    public static async removeAllFrom(folder: vscode.WorkspaceFolder): Promise<void> {
        const pomPaths: string[] = await getAllPomPaths(folder);
        for (const pomPath of pomPaths) {
            MavenProjectManager.remove(pomPath);
        }
    }

}

async function getAllPomPaths(workspaceFolder?: vscode.WorkspaceFolder): Promise<string[]> {
    if (!workspaceFolder) {
        if (vscode.workspace.workspaceFolders) {
            const arrayOfPoms: string[][] = await Promise.all(vscode.workspace.workspaceFolders.map(getAllPomPaths));
            return [].concat.apply([], arrayOfPoms);
        } else {
            return [];
        }
    }
    const exclusions: string[] = Settings.excludedFolders(workspaceFolder.uri);
    const pattern: string = Settings.Pomfile.globPattern();
    const pomFileUris: vscode.Uri[] = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder, pattern), `{${exclusions.join(",")}}`);
    return pomFileUris.map(_uri => _uri.fsPath);
}