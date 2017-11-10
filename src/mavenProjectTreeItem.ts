import * as vscode from "vscode";
import { TreeItemCollapsibleState } from "vscode";

export class MavenProjectTreeItem extends vscode.TreeItem {
    public pomXmlFilePath: string;
    
    constructor(label: string, pomXmlFilePath: string) {
        super(label, TreeItemCollapsibleState.Collapsed);
        this.pomXmlFilePath = pomXmlFilePath;
        this.contextValue = 'mavenProject';
    }

}