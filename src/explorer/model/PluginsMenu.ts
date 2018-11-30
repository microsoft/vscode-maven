// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MavenPlugin } from "./MavenPlugin";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class PluginsMenu extends Menu {
    constructor(project: MavenProject) {
        super(project);
        this._name = "Plugins";
    }

    public getChildren() : MavenPlugin[] {
        return [];
    }
}
