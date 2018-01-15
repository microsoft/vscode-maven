// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { Utils } from "../Utils";
import { IPomModules, IPomRoot } from "./XmlSchema";

export class ProjectItem extends TreeItem {
    public abosolutePath: string;
    public workspacePath: string;
    public artifactId: string;
    public params: {
        pom?: IPomRoot,
        modules?: IPomModules[]
    };

    constructor(artifactId: string, workpacePath: string, absolutePath: string, params?: object) {
        super(`${artifactId}`, TreeItemCollapsibleState.Collapsed);
        this.artifactId = artifactId;
        this.abosolutePath = absolutePath;
        this.params = params || {};
        this.contextValue = "ProjectItem";
        this.workspacePath = workpacePath;
        this.iconPath = Utils.getPathToExtensionRoot("resources", "project.svg");
    }
}
