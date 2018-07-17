// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import * as Constants from "../../Constants";
import { Utils } from "../../Utils";
import { MavenProject } from "./MavenProject";
import { ModulesMenuNode } from "./ModulesMenuNode";
import { NodeBase } from "./NodeBase";

export class MavenProjectNode extends NodeBase {
    private _mavenProject: MavenProject;
    private _pomPath: string;
    constructor(pomPath: string) {
        super();
        this._pomPath = pomPath;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        await this._ensureMavenProjectParsed();
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._mavenProject.name);
        treeItem.iconPath = {
            light: Utils.getResourcePath("project.svg"),
            dark: Utils.getResourcePath("project.svg")
        };
        treeItem.contextValue = Constants.contextValue.MAVEN_PROJECT_NODE;
        treeItem.collapsibleState = this._hasModules ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        treeItem.command = { title: "open pom", command: "maven.project.openPom", arguments: [this] };
        return treeItem;

    }

    public getChildren(): vscode.ProviderResult<NodeBase[]> {
        return this._hasModules ? [new ModulesMenuNode(this)] : [];
    }

    /**
     * @return list of absolute path of modules pom.xml.
     */
    public get modules(): string[] {
        return this._mavenProject.modules.map(moduleName => path.join(path.dirname(this._pomPath), moduleName, "pom.xml"));
    }

    public get pomPath(): string {
        return this._pomPath;
    }

    public get mavenProject(): MavenProject {
        return this._mavenProject;
    }
    private get _hasModules(): boolean {
        return this._mavenProject.modules.length > 0;
    }

    private async _ensureMavenProjectParsed(): Promise<void> {
        if (!this._mavenProject) {
            const pom: {} = await Utils.parseXmlFile(this._pomPath);
            this._mavenProject = new MavenProject(pom);
        }
    }
}
