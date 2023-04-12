// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export interface ITreeItem {
    getContextValue(): string;
    getTreeItem(): vscode.TreeItem2 | Thenable<vscode.TreeItem2>;

    /**
     * If implemented, it will be triggered to get children items.
     */
    getChildren?(): ITreeItem[] | undefined | Promise<ITreeItem[] | undefined>;

    /**
     * If implemented, it will be triggered to refresh tree item.
     */
    refresh?(): void | Promise<void>;
}
