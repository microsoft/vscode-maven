// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
export abstract class NodeBase {
    public abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
    public abstract getChildren(): vscode.ProviderResult<NodeBase[]>;
}
