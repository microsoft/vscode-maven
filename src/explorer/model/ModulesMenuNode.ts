// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { MavenProjectNode } from "./MavenProjectNode";
import { MenuNode } from "./MenuNode";

export class ModulesMenuNode extends MenuNode {
    constructor(projectNode: MavenProjectNode) {
        super(projectNode);
        this._name = "Modules";
    }

    public getChildren() : MavenProjectNode[] {
        return this._projectNode.modules.map(modulePomPath => new MavenProjectNode(modulePomPath));
    }
}
