// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { diagnosticProvider } from "../../DiagnosticProvider";
import { parseRawDependencyDataHandler } from "../../handlers/parseRawDependencyDataHandler";
import { getPathToExtensionRoot } from "../../utils/contextUtils";
import { Dependency } from "./Dependency";
import { HintNode } from "./HintNode";
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

    public async getChildren() : Promise<Dependency[] | HintNode[]> {
        const treeNodes = await parseRawDependencyDataHandler(this.project);
        await diagnosticProvider.refreshDiagnostics(vscode.Uri.file(this.project.pomPath));
        if (treeNodes.length === 0) {
            const hintNodes: HintNode[] = [new HintNode("No dependencies")];
            return Promise.resolve(hintNodes);
        } else {
            return Promise.resolve(treeNodes);
        }
    }
    public async getParent(): Promise<ITreeItem> {
        return Promise.resolve(this.project);
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this.name, vscode.TreeItemCollapsibleState.Collapsed);
        const uri: vscode.Uri = vscode.Uri.file("");
        treeItem.resourceUri = uri.with({authority: this.project.pomPath}); // distinguish dependenciesMenu in multi-module project
        treeItem.tooltip = this.name;
        // TODO: switch to codicon folder-library after vscode's next release in early Sept.
        const iconFile: string = "library-folder.svg";
        treeItem.iconPath = {
            light: getPathToExtensionRoot("resources", "icons", "light", iconFile),
            dark: getPathToExtensionRoot("resources", "icons", "dark", iconFile)
        };
        return treeItem;
    }
}
