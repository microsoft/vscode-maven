// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export interface ITreeItem {
    getContextValue(): string;
    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;

    /**
     * If implemented, it will be triggered to get children items.
     */
    getChildren?(): vscode.ProviderResult<ITreeItem[]>;

    /**
     * If implemented, it will be triggered before manual refreshing current tree item.
     */
    removeChildren?(): void | Thenable<void>;
}
