// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs";
import * as _ from "lodash";
import * as path from "path";
import * as vscode from "vscode";
import { MavenProjectManager } from "../../project/MavenProjectManager";
import { Settings } from "../../Settings";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { Utils } from "../../utils/Utils";
import { EffectivePomProvider } from "../EffectivePomProvider";
import { MavenExplorerProvider } from "../MavenExplorerProvider";
import { DependenciesMenu } from "./DependenciesMenu";
import { Dependency } from "./Dependency";
import { IEffectivePom } from "./IEffectivePom";
import { ITreeItem } from "./ITreeItem";
import { LifecycleMenu } from "./LifecycleMenu";
import { MavenPlugin } from "./MavenPlugin";
import { PluginsMenu } from "./PluginsMenu";
import { FavoritesMenu } from "./FavoritesMenu";

const CONTEXT_VALUE = "maven:project";

export class MavenProject implements ITreeItem {
    public parent?: MavenProject; // assigned if it's specified as one of parent project's modules
    public pomPath: string;
    public _fullDependencyText: string;
    public _conflictNodes: Dependency[];
    public dependencyNodes: Dependency[];
    private ePomProvider: EffectivePomProvider;
    private _ePom: any;
    private _pom: any;
    private properties: Map<string, string> = new Map();

    constructor(pomPath: string) {
        this.pomPath = pomPath;
        this.ePomProvider = new EffectivePomProvider(pomPath);
    }

    public get name(): string {
        // use <name> if provided, fallback to <artifactId>
        if (this._pom?.project?.name?.[0] !== undefined) {
            const rawName: string = this._pom.project.name[0];
            return this.fillProperties(rawName);
        } else {
            return this._pom?.project?.artifactId?.[0];
        }

    }

    public get fullText(): string {
        return this._fullDependencyText;
    }

    public set fullText(text: string) {
        this._fullDependencyText = text;
    }

    public get groupId(): string {
        return this._pom?.project?.groupId?.[0] ?? this._pom?.project?.parent?.[0]?.groupId?.[0] ?? this.parent?.groupId;
    }

    public get artifactId(): string {
        return this._pom?.project?.artifactId?.[0];
    }

    public get version(): string {
        return this._pom?.project?.version?.[0] ?? this._pom?.project?.parent?.[0]?.version?.[0] ?? this.parent?.version;
    }

    public get id(): string {
        return `${this.groupId}:${this.artifactId}`;
    }

    public get packaging(): string {
        return _.get(this._pom, "project.packaging[0]");
    }

    public get moduleNames(): string[] {
        const moduleNames: string[] | undefined = _.get(this._pom, "project.modules[0].module");
        return moduleNames ? moduleNames : [];
    }

    public get plugins(): MavenPlugin[] {
        let plugins: any[] | undefined;
        if (_.has(this._ePom, "projects.project")) {
            // multi-module project
            const project: any = this._ePom.projects.project.find((elem: any) => this.name === _.get(elem, "artifactId[0]"));
            if (project) {
                plugins = _.get(project, "build[0].plugins[0].plugin");
            }
        } else {
            // single-project
            plugins = _.get(this._ePom, "project.build[0].plugins[0].plugin");
        }
        return this._convertXmlPlugin(plugins);
    }

    public get dependencies(): any[] {
        let deps: any[] = [];
        if (_.has(this._ePom, "projects.project")) {
            // multi-module project
            const project: any = (this._ePom.projects.project).find((elem: any) => this.name === _.get(elem, "artifactId[0]"));
            if (project) {
                deps = _.get(project, "build[0].plugins[0].plugin");
            }
        } else {
            // single-project
            deps = _.get(this._ePom, "project.dependencies[0].dependency");
        }
        return deps;
    }

    /**
     * @return list of absolute path of modules pom.xml.
     */
    public get modules(): string[] {
        return this.moduleNames.map(moduleName => {
            const relative: string = path.join(path.dirname(this.pomPath), moduleName);
            if (fs.existsSync(relative) && fs.statSync(relative).isFile()) {
                return relative;
            } else {
                return path.join(relative, "pom.xml");
            }
        });
    }

    /**
     * Absolute path of parent POM, inferred from `parent.relativePath`.
     */
    public get parentPomPath(): string {
        const relativePath: string = this._pom?.project?.parent?.[0]?.relativePath?.[0] ?? "../pom.xml";
        return path.join(path.dirname(this.pomPath), relativePath);
    }

    public get conflictNodes(): Dependency[] {
        return this._conflictNodes ?? [];
    }

    public set conflictNodes(nodes: Dependency[]) {
        this._conflictNodes = nodes;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        await this.parsePom();
        const label = this.artifactId ? Settings.getExploreProjectName(this) : "Unknown";
        const iconFile: string = this.packaging === "pom" ? "root.svg" : "project.svg";
        const treeItem: vscode.TreeItem = new vscode.TreeItem(label);
        treeItem.iconPath = {
            light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
            dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
        };
        treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        treeItem.description = this.id;
        treeItem.tooltip = this.pomPath;
        return treeItem;
    }

    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public getChildren(): ITreeItem[] {
        const ret: ITreeItem[] = [];
        ret.push(new LifecycleMenu(this));
        ret.push(new PluginsMenu(this));
        ret.push(new DependenciesMenu(this));
        ret.push(new FavoritesMenu(this));
        if (this.moduleNames.length > 0 && Settings.viewType() === "hierarchical") {
            const projects: MavenProject[] = this.modules.map(m => MavenProjectManager.get(m)).filter(Boolean) as MavenProject[];
            ret.push(...projects);
        }
        return ret;
    }

    public async refreshEffectivePom(): Promise<void> {
        await this.ePomProvider.calculateEffectivePom();
    }

    public async getEffectivePom(options?: { cacheOnly?: boolean }): Promise<IEffectivePom> {
        let res: IEffectivePom = { pomPath: this.pomPath };
        try {
            res = await this.ePomProvider.getEffectivePom(options);
            this._ePom = res?.ePom;
        } catch (error) {
            console.error(error);
            throw new Error("Failed to calculate Effective POM. Please check output window 'Maven for Java' for more details.");
        }
        return res;
    }

    public async refresh(): Promise<void> {
        await this._refreshPom();
    }

    public async parsePom(): Promise<void> {
        try {
            this._pom = await Utils.parseXmlFile(this.pomPath);
            this.updateProperties();
        } catch (error) {
            this._pom = undefined;
        }
    }

    public getDependencyVersion(gid: string, aid: string): string | undefined {
        const deps: any[] | undefined = this.dependencies;
        const targetDep: any = deps?.find(elem => _.get(elem, "groupId[0]") === gid && _.get(elem, "artifactId[0]") === aid);
        return targetDep?.version?.[0];
    }

    private async _refreshPom(): Promise<void> {
        await this.parsePom();
        MavenExplorerProvider.getInstance().refresh(this);
    }

    private _convertXmlPlugin(plugins: any[] | undefined): MavenPlugin[] {
        if (plugins && plugins.length > 0) {
            return plugins.map(p => new MavenPlugin(
                this,
                _.has(p, "groupId[0]") ? _.get(p, "groupId[0]") : "org.apache.maven.plugins",
                _.get(p, "artifactId[0]"),
                _.get(p, "version[0]")
            ));
        }
        return [];
    }

    private updateProperties(): void {
        if (this?._pom?.project?.properties?.[0] !== undefined) {
            for (const [key, value] of Object.entries<any>(this._pom.project.properties[0])) {
                this.properties.set(key, value[0]);
            }
        }
    }

    public fillProperties(rawName: string): string {
        const stringTemplatePattern = /\$\{.*?\}/g;
        const matches: RegExpMatchArray | null = rawName.match(stringTemplatePattern);
        if (matches === null) {
            return rawName;
        }

        let name: string = rawName;
        for (const placeholder of matches) {
            const key: string = placeholder.slice(2, placeholder.length - 1);
            const value: string | undefined = this.getProperty(key);
            if (value !== undefined) {
                name = name.replace(placeholder, value);
            }
        }
        return name;
    }

    /**
     * Get value of a property, including those inherited from parents
     * @param key property name
     * @returns value of property
     */
    private getProperty(key: string): string | undefined {
        if (this.properties.has(key)) {
            return this.properties.get(key);
        }

        let cur: MavenProject | undefined = MavenProjectManager.get(this.parentPomPath) ?? this.parent;
        while (cur !== undefined) {
            if (cur.properties.has(key)) {
                return cur.properties.get(key);
            }
            cur = MavenProjectManager.get(cur.parentPomPath) ?? cur.parent;
        }

        return undefined;
    }

    /**
     * get properties from effective pom
     */
    public getProperties() {
        const propertiesNode = _.get(this._ePom, "project.properties[0]");
        if (typeof propertiesNode === "object") {
            return Object.keys(propertiesNode);
        } else {
            return undefined;
        }
    }
}
