// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class WorkspaceItem extends TreeItem {
    public abosolutePath: string;
    public name: string;
    public params: {
    };

    constructor(name: string, absolutePath: string, params?: object) {
        super(name, TreeItemCollapsibleState.Expanded);
        this.name = name;
        this.abosolutePath = absolutePath;
        this.params = params || {};
        this.contextValue = "WorkspaceItem";
    }
}
