// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { ITreeItem } from "./ITreeItem";
import { ITreeNode } from "./ITreeNode";
import { IOmittedStatus } from "./OmittedStatus";

export class Dependency implements ITreeItem, ITreeNode {
    public fullArtifactName = ""; // groupId:artifactId:version:scope
    public projectPomPath: string;
    public groupId: string;
    public artifactId: string;
    public version: string;
    public scope: string;
    public omittedStatus?: IOmittedStatus;
    public uri: vscode.Uri;
    public children: Dependency[] = [];
    public root: Dependency;
    public parent: Dependency;
    constructor(gid: string, aid: string, version: string, scope: string, projectPomPath: string, omittedStatus?: IOmittedStatus) {
        this.groupId = gid;
        this.artifactId = aid;
        this.version = version;
        this.scope = scope;
        this.fullArtifactName = [gid, aid, version, scope].join(":");
        this.projectPomPath = projectPomPath;
        this.omittedStatus = omittedStatus;
    }

    public addChild(node: Dependency): void {
        node.parent = this;
        this.children.push(node);
    }

    public getContextValue(): string {
        const root = this.root;
        let contextValue = "maven:dependency";
        if (root.fullArtifactName === this.fullArtifactName) {
            contextValue = `${contextValue}+root`;
        }
        if (this.omittedStatus?.status === "conflict") {
           contextValue = `${contextValue}+conflict`;
        }
        return contextValue;
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(this.children);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const label = [this.groupId, this.artifactId, this.version].join(":");
        const treeItem: vscode.TreeItem = new vscode.TreeItem(label);
        treeItem.resourceUri = this.uri;
        treeItem.tooltip = this.fullArtifactName;
        if (this.children.length !== 0) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }

        // icons
        if (this.omittedStatus === undefined) {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        } else if (this.omittedStatus.status === "duplicate") {
            const iconFile = "LibraryDuplicate.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
        } else if (this.omittedStatus.status === "conflict") {
            const iconFile = "LibraryConflict.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
        }

        // description
        const descriptions: string[] = [];
        if (!this.scope.includes("compile")) {
            descriptions.push(`(${this.scope})`);
        }
        if (this.omittedStatus !== undefined) {
            descriptions.push(this.omittedStatus.description);
        }
        treeItem.description = descriptions.join(" ");
        return treeItem;
    }
}
