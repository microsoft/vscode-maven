// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
export interface ITreeItem {
    getContextValue(): string;
    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
    getChildren(): vscode.ProviderResult<ITreeItem[]>;
}
