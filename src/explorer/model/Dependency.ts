// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { getPathToExtensionRoot, localPomPath } from "../../utils/contextUtils";
import { IConflictMessage } from "./IConflictMessage";
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
    public conflictMessages: IConflictMessage[] = [];
    constructor(gid: string, aid: string, version: string, scope: string, omittedStatus: IOmittedStatus, projectPomPath: string) {
        super();
        this._gid = gid;
        this._aid = aid;
        this._version = version;
        this._scope = scope;
        this.fullArtifactName = [gid, aid, version, scope].join(":");
        this._omittedStatus = omittedStatus;
        this._projectPomPath = projectPomPath;
        if (omittedStatus.status === "conflict") {
            const conflictMessage: IConflictMessage = {gid: gid, aid: aid, version1: version, version2: omittedStatus.effectiveVersion};
            this.conflictMessages.push(conflictMessage);
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
        const filePath: string = localPomPath(this._gid, this._aid, this._version);
        let uri: vscode.Uri = vscode.Uri.file(filePath);
        uri = uri.with({authority: this.projectPomPath});
        if (this.conflictMessages.length !== 0) {
            uri = vscode.Uri.joinPath(uri, "hasConflict");
        }
        return uri;
    }

    public getContextValue(): string {
        return "Dependency";
    }

    public async getChildren(): Promise<Dependency[] | undefined> {
        return Promise.resolve(<Dependency[]> this.children);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.fullArtifactName);
        treeItem.resourceUri = this.uri;
        if (this.children.length !== 0) {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        } else {
            treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
        }

        if (this._omittedStatus.status === "duplicate") {
            const iconFile: string = "library-remove.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
            treeItem.description = this._omittedStatus.description;
        } else if (this._omittedStatus.status === "conflict") {
            const iconFile: string = "library-warning.svg";
            treeItem.iconPath = {
                light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
                dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
            };
            treeItem.description = this._omittedStatus.description;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        }
        return treeItem;
    }
}
