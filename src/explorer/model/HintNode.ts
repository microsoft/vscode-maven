// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";

export class HintNode implements ITreeItem {
    public getContextValue(): string {
        return "HintNode";
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem("");
        treeItem.description = "No dependencies";
        return treeItem;
    }
}
