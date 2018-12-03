// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITreeItem } from "./ITreeItem";
import { MavenPlugin } from "./MavenPlugin";
import { MavenProject } from "./MavenProject";
import { Menu } from "./Menu";

export class PluginsMenu extends Menu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this._name = "Plugins";
    }

    public getChildren() : MavenPlugin[] {
        // TODO: get list of plugins
        return [
            new MavenPlugin(this._project, "org.apache.maven.plugins", "maven-help-plugin")
        ];
    }
}
