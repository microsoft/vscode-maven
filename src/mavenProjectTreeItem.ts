import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";

export class MavenProjectTreeItem extends vscode.TreeItem {
    public pomXmlFilePath: string;
    public params: any;
    
    constructor(label: string, pomXmlFilePath: string, contextValue?: string, params?: object) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this.pomXmlFilePath = pomXmlFilePath;
        this.contextValue = contextValue || 'folder';
        this.params = params || {};
    }

}