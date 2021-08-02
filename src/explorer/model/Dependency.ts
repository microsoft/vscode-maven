// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { ITreeItem } from "./ITreeItem";
import { IOmittedStatus } from "./OmittedStatus";
import { TreeNode } from "./TreeNode";

export class Dependency extends TreeNode implements ITreeItem {
    private fullArtifactName: string = ""; // groupId:artifactId:version:scope
    private _projectPomPath: string;
    private _gid: string;
    private _aid: string;
    private _version: string;
    private _scope: string;
    private _omittedStatus: IOmittedStatus;
    private _uri: vscode.Uri;
    constructor(gid: string, aid: string, version: string, scope: string, projectPomPath: string, omittedStatus?: IOmittedStatus) {
        super();
        this._gid = gid;
        this._aid = aid;
        this._version = version;
        this._scope = scope;
        this.fullArtifactName = [gid, aid, version, scope].join(":");
        this._projectPomPath = projectPomPath;
        if (omittedStatus) {
            this._omittedStatus = omittedStatus;
        }
    }
    public get omittedStatus(): IOmittedStatus {
        return this._omittedStatus;
    }

    public get projectPomPath(): string {
        return this._projectPomPath;
    }
    public get fullName(): string {
        return this.fullArtifactName;
    }

    public get groupId(): string {
        return this._gid;
    }

    public get artifactId(): string {
        return this._aid;
    }
    public get version(): string {
        return this._version;
    }
    public get scope(): string {
        return this._scope;
    }

    public get uri(): vscode.Uri {
        return this._uri;
    }

    public set uri(uri: vscode.Uri) {
        this._uri = uri;
    }

    public getContextValue(): string {
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
        if (this._omittedStatus === undefined) {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        } else if (this._omittedStatus.status === "duplicate") {
            const iconFile: string = "library-remove.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
        } else if (this._omittedStatus.status === "conflict") {
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
        if (this._omittedStatus !== undefined) {
            descriptions.push(this._omittedStatus.description);
        }
        treeItem.description = descriptions.join(" ");
        return treeItem;
    }
}
