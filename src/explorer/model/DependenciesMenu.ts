// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { diagnosticProvider } from "../../DiagnosticProvider";
import { parseRawDependencyDataHandler } from "../../handlers/parseRawDependencyDataHandler";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { Dependency } from "./Dependency";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class DependenciesMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Dependencies";
    }

    public getContextValue(): string {
        return "DependenciesMenu";
    }

    public async getChildren() : Promise<Dependency[]> {
        const [treeNodes, conflictNodes] = await parseRawDependencyDataHandler(this.project);
        await diagnosticProvider.refreshDiagnostics(vscode.Uri.file(this.project.pomPath), conflictNodes);
        return Promise.resolve(treeNodes);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        const iconFile: string = "library-folder.svg";
        treeItem.iconPath = {
            light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
            dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
        };
        return treeItem;
    }
}
