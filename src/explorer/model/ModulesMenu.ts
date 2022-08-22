// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MavenProjectManager } from "../../project/MavenProjectManager";
import { ITreeItem } from "./ITreeItem";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

/**
 * @deprecated
 */
export class ModulesMenu extends Menu implements ITreeItem {
    constructor(projectNode: MavenProject) {
        super(projectNode);
        this.name = "Modules";
    }

    public getChildren() : MavenProject[] {
        return this.project.modules.map(modulePomPath => {
            const found: MavenProject | undefined = MavenProjectManager.get(modulePomPath);
            return found ? found : new MavenProject(modulePomPath);
        });
    }
}
