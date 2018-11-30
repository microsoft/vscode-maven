// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { ModulesMenu } from "./ModulesMenu";
import { PluginsMenu } from "./PluginsMenu";

const CONTEXT_VALUE: string = "MavenProject";

export class MavenProject implements ITreeItem {

    private _pom: any;
    private _pomPath: string;

    constructor(pomPath: string) {
        this._pomPath = pomPath;
    }

    public get name(): string {
        return _.get(this._pom, "project.artifactId[0]");
    }

    public get moduleNames(): string[] {
        return _.get(this._pom, "project.modules[0].module") || [];
    }

    /**
     * @return list of absolute path of modules pom.xml.
     */
    public get modules(): string[] {
        return this.moduleNames.map(moduleName => path.join(path.dirname(this._pomPath), moduleName, "pom.xml"));
    }

    public get pomPath(): string {
        return this._pomPath;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        if (! await this.hasValidPom()) {
            return undefined;
        }

        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name);
        treeItem.iconPath = {
            light: Utils.getResourcePath("project.svg"),
            dark: Utils.getResourcePath("project.svg")
        };
        treeItem.contextValue = this.getContextValue();
        treeItem.collapsibleState = this._hasModules ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
        treeItem.command = { title: "open pom", command: "maven.project.openPom", arguments: [this] };
        return treeItem;
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public getChildren(): vscode.ProviderResult<ITreeItem[]> {
        const ret: ITreeItem[] = [];
        if (this._hasModules) {
            ret.push(new ModulesMenu(this));
        }
        ret.push(new PluginsMenu(this));
        return ret;
    }

    public async hasValidPom(): Promise<boolean> {
        await this._parseMavenProject();
        return !!this._pom;
    }

    private get _hasModules(): boolean {
        return this.moduleNames.length > 0;
    }

    private async _parseMavenProject(): Promise<void> {
        if (!this._pom) {
            try {
                this._pom = await Utils.parseXmlFile(this._pomPath);
            } catch (error) {
                // Error parsing pom.xml file
            }
        }
    }
}
