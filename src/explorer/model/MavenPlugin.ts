// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { ITreeItem } from "./ITreeItem";

const CONTEXT_VALUE: string = "MavenPlugin";

export class MavenPlugin implements ITreeItem {
    public getContextValue(): string {
        return CONTEXT_VALUE;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        return null;
    }

    public getChildren(): vscode.ProviderResult<ITreeItem[]> {
        return null;
    }
}
