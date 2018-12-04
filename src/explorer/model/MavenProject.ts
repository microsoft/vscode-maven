// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { Utils } from "../../Utils";
import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";
import { ModulesMenu } from "./ModulesMenu";
import { PluginsMenu } from "./PluginsMenu";

const CONTEXT_VALUE: string = "MavenProject";

export class MavenProject implements ITreeItem {

    private _rawEffectivePom: string;
    private _effectivePom: any;
    private _pom: any;
    private _pomPath: string;

    constructor(pomPath: string) {
        this._pomPath = pomPath;
        this.calculateEffectivePom();
    }

    public get name(): string {
        return _.get(this._pom, "project.artifactId[0]");
    }

    public get moduleNames(): string[] {
        return _.get(this._pom, "project.modules[0].module") || [];
    }

    public async plugins(): Promise<MavenPlugin[]> {
        let plugins: any[];
        await this.calculateEffectivePom();
        if (_.get(this._effectivePom, "projects.project")) {
            // multi-module project
            const project: any = (<any[]>this._effectivePom.projects.project).find((elem: any) => this.name === _.get(elem, "artifactId[0]"));
            if (project) {
                plugins = _.get(project, "build[0].plugins[0].plugin");
            }
        } else {
            // single-project
            plugins = _.get(this._effectivePom, "project.build[0].plugins[0].plugin");
        }
        return this.convertXmlPlugin(plugins);
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
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
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
        await this._parsePom();
        return !!this._pom;
    }

    public async calculateEffectivePom(force?: boolean): Promise<void> {
        if (!force && this._rawEffectivePom) {
            return;
        }

        this._rawEffectivePom = await Utils.getEffectivePom(this._pomPath);
        await this._parseEffectivePom();
    }

    private get _hasModules(): boolean {
        return this.moduleNames.length > 0;
    }

    private async _parsePom(): Promise<void> {
        if (!this._pom) {
            try {
                this._pom = await Utils.parseXmlFile(this._pomPath);
            } catch (error) {
                // Error parsing pom.xml file
            }
        }
    }

    private async _parseEffectivePom(): Promise<void> {
        if (!this._effectivePom) {
            try {
                this._effectivePom = await Utils.parseXmlContent(this._rawEffectivePom);
            } catch (error) {
                // Error parsing pom.xml file
            }
        }
    }

    private convertXmlPlugin(plugins: any[]): MavenPlugin[] {
        if (plugins && plugins.length > 0) {
            return plugins.map(p => new MavenPlugin(
                this,
                _.get(p, "groupId[0]") || "org.apache.maven.plugins",
                _.get(p, "artifactId[0]"),
                _.get(p, "version[0]")
            ));
        }
        return [];
    }
}
