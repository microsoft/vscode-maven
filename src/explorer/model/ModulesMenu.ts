// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { mavenExplorerProvider } from "../mavenExplorerProvider";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

/**
 * @deprecated
 */
export class ModulesMenu extends Menu implements ITreeItem {
    constructor(projectNode: MavenProject) {
        super(projectNode);
        this._name = "Modules";
    }

    public getChildren() : MavenProject[] {
        return this._project.modules.map(modulePomPath => {
            const found: MavenProject | undefined = mavenExplorerProvider.getMavenProject(modulePomPath);
            return  found ? found : new MavenProject(modulePomPath);
        });
    }
}
