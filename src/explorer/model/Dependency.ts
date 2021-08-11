// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { ITreeItem } from "./ITreeItem";
import { IOmittedStatus } from "./OmittedStatus";
import { TreeNode } from "./TreeNode";

export class Dependency extends TreeNode implements ITreeItem {
    public fullArtifactName: string = ""; // groupId:artifactId:version:scope
    public projectPomPath: string;
    public groupId: string;
    public artifactId: string;
    public version: string;
    public scope: string;
    public omittedStatus?: IOmittedStatus;
    public uri: vscode.Uri;
    constructor(gid: string, aid: string, version: string, scope: string, projectPomPath: string, omittedStatus?: IOmittedStatus) {
        super();
        this.groupId = gid;
        this.artifactId = aid;
        this.version = version;
        this.scope = scope;
        this.fullArtifactName = [gid, aid, version, scope].join(":");
        this.projectPomPath = projectPomPath;
        this.omittedStatus = omittedStatus;
    }

    public getContextValue(): string {
        const root = <Dependency> this.root;
        if(root.fullArtifactName === this.fullArtifactName) {
            return "rootDependency";
        }
        return "Dependency";
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(<Dependency[]> this.children);
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
            const iconFile: string = "library-remove.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
        } else if (this.omittedStatus.status === "conflict") {
            const iconFile: string = "library-warning.svg";
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
