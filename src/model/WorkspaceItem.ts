
import { TreeItem, TreeItemCollapsibleState } from "vscode";

export class WorkspaceItem extends TreeItem {
    public abosolutePath: string;
    public name: string;
    public params: {
    };

    constructor(name: string, absolutePath: string, params?: object) {
        super(name, TreeItemCollapsibleState.Collapsed);
        this.name = name;
        this.abosolutePath = absolutePath;
        this.params = params || {};
        this.contextValue = "WorkspaceItem";
    }
}
