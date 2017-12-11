import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { IPomModules, IPomRoot } from "./XmlSchema";

export class FolderItem extends TreeItem {
    public parentAbsolutePath: string;
    public workspacePath: string;
    public name: string;
    public params: {
        pom?: IPomRoot,
        modules?: IPomModules[]
    };

    constructor(name: string, contextValue: string, parentAbsolutePath: string, workpacePath: string, params?: object) {
        super(name, TreeItemCollapsibleState.Collapsed);
        this.name = name;
        this.workspacePath = workpacePath;
        this.parentAbsolutePath = parentAbsolutePath;
        this.contextValue = contextValue;
        this.params = params || {};
    }
}
