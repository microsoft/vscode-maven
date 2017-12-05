
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { IPomModules, IPomRoot } from "./XmlSchema";

export class ProjectItem extends TreeItem {
    public pomXmlFilePath: string;
    public params: {
        artifactId?: string,
        pom?: IPomRoot,
        modules?: IPomModules[]
    };

    constructor(label: string, pomXmlFilePath: string, contextValue?: string, params?: object) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this.pomXmlFilePath = pomXmlFilePath;
        this.contextValue = contextValue || "folder";
        this.params = params || {};
    }
}
