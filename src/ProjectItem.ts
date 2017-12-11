
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { IPomModules, IPomRoot } from "./XmlSchema";

export class ProjectItem extends TreeItem {
    public abosolutePath: string;
    public params: {
        artifactId?: string,
        pom?: IPomRoot,
        modules?: IPomModules[]
    };

    constructor(label: string, absolutePath: string, contextValue?: string, params?: object) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this.abosolutePath = absolutePath;
        this.contextValue = contextValue || "folder";
        this.params = params || {};
    }
}
