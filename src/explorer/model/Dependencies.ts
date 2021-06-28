// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";

const DUPLICATE_VALUE: string = "omitted for duplicate";
const CONFLICT_VALUE: string = "omitted for conflict";

export class Dependencies implements ITreeItem {
    public dependency: string;
    public pomPath: string;
    private curDep: string;
    private separator: string;
    private collapsedState: vscode.TreeItemCollapsibleState;

    constructor(dependency: string, separator: string, collapsedState: vscode.TreeItemCollapsibleState, pomPath: string) {
        this.dependency = dependency;
        this.separator = separator + "   "; //three spaces
        this.collapsedState = collapsedState;
        this.pomPath = pomPath;
    }

    public getContextValue(): string {
        return "Dependencies";
    }

    public async getChildren(): Promise<Dependencies[] | undefined> {
        return Promise.resolve(this.getDepsInString(this.dependency));
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        this.curDep = this.dependency.split(this.separator, 1)[0];
        //handle the version switch in conflict
        if (this.curDep.indexOf(CONFLICT_VALUE) !== -1) {
            const re = /([\w.]+:[\w.-]+:)([\w.-]+)(:[\w/.(\s]+):\s([\w.-]+)\)/gm;
            this.curDep = this.curDep.replace(re, "$1$4$3 with $2)");
        }
        const indexCut: number = this.curDep.indexOf("(");
        let depLabel: string;
        let depDescription: string = "";
        if (indexCut === -1) {
            depLabel = this.curDep;
        } else {
            depLabel = this.curDep.substr(0, indexCut);
            depDescription = this.curDep.substr(indexCut);
        }
        //highlight for conflict and description for duplicate
        const treeItem: vscode.TreeItem = new vscode.TreeItem(depLabel, this.collapsedState);
        if (this.curDep.indexOf(DUPLICATE_VALUE) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("trash");
            treeItem.description = depDescription;
        } else if (this.curDep.indexOf(CONFLICT_VALUE) !== -1) {
            treeItem.iconPath = new vscode.ThemeIcon("warning");
            treeItem.description = depDescription;
        } else {
            treeItem.iconPath = new vscode.ThemeIcon("library");
        }
        return treeItem;
    }

    private getDepsInString(treecontent: string): Dependencies[] {
        if (treecontent) {
            const treeChildren: string[] = treecontent.split(this.separator + "+-").splice(1); //delelte first line
            const toDep = (treeChild: string): Dependencies => {
                if (treeChild.indexOf("\r\n") === -1){
                    return new Dependencies(treeChild, this.separator, vscode.TreeItemCollapsibleState.None, this.pomPath);
                } else {
                    return new Dependencies(treeChild, this.separator, vscode.TreeItemCollapsibleState.Collapsed, this.pomPath);
                }
            };
            return treeChildren.map(dep => toDep(dep));
        } else {
            return [];
        }
    }
}
