import * as vscode from "vscode";
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { Utils } from "./utils";

export class MavenProjectsTreeDataProvider implements  vscode.TreeDataProvider<vscode.TreeItem> {
    constructor(protected context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: vscode.TreeItem) : Thenable<vscode.TreeItem[]> {
        if (element == undefined) {
            const projects: MavenProjectTreeItem[] = [];
            vscode.workspace.getWorkspaceFolder;
            const pomXmlFilePaths: string[] = Utils.getPomXmlFilePaths();
            pomXmlFilePaths.forEach(pomXmlFilePath => {
                const name = Utils.getProjectName(pomXmlFilePath);
                projects.push(new MavenProjectTreeItem(name, pomXmlFilePath));
            }); 
            return Promise.resolve(projects);
        }
        else if (element.contextValue == 'mavenProject') {
            const items = [];
            ['Lifecycle', 'Dependencies'].forEach(name => {
                const item = new TreeItem(name, TreeItemCollapsibleState.Collapsed);
                item.contextValue = name;
                items.push(item);
            });
            return Promise.resolve(items);
        }
        else if (element.contextValue == 'Lifecycle') {
            const items = [];
            ['clean', 'validate', 'compile', 'test', 'package', 'verify', 'install', 'site', 'deploy'].forEach(phase => {
                const item = new TreeItem(phase);
                items.push(item);
            });
            return Promise.resolve(items);
        }
        else if (element.contextValue == 'Dependencies') {
            const items = [];
            // TODO
            return Promise.resolve(items);
        }
    }
}