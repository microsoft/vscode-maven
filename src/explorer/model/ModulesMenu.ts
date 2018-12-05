// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { mavenExplorerProvider } from "../MavenExplorerProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class ModulesMenu extends Menu implements ITreeItem {
    constructor(projectNode: MavenProject) {
        super(projectNode);
        this._name = "Modules";
    }

    public getChildren() : MavenProject[] {
        return this._project.modules.map(modulePomPath => {
            return mavenExplorerProvider.mavenProjectNodes.find(elem => elem.pomPath === modulePomPath) || new MavenProject(modulePomPath);
        });
    }
}
