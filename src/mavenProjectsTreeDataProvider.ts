import * as vscode from "vscode";
import * as path from "path";
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { Utils } from "./utils";

export class MavenProjectsTreeDataProvider implements  vscode.TreeDataProvider<vscode.TreeItem> {
    constructor(protected context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(node?: vscode.TreeItem) : Thenable<vscode.TreeItem[]> {
        const element = node as MavenProjectTreeItem;
        if (element == undefined) {
            // const projects: MavenProjectTreeItem[] = [];
            // const pomXmlFilePaths: string[] = Utils.getPomXmlFilePaths();
            // pomXmlFilePaths.forEach(pomXmlFilePath => {
            //     const item = Utils.getDefaultProjects(pomXmlFilePath);
            //     projects.push(item);
            // }); 
            const item = Utils.getProject("pom.xml");
            item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
            return Promise.resolve([item]);
        }
        // else if (element.contextValue == 'mavenProjects') {
        //     // aggregate pom
        //     const items = [];
        //     ['Lifecycle', 'Dependencies'].forEach(name => {
        //         const item = new MavenProjectTreeItem(name, element.pomXmlFilePath, name);
        //         items.push(item);
        //     });
        //     const projects = element as MavenProjectTreeItem;
        //     const projectNames = projects.params as Array<string>;
        //     projectNames.forEach((name) => items.push(new TreeItem(name)));
        //     return Promise.resolve(items);
        // }
        else if (element.contextValue == 'mavenProject') {
            const items = [];
            // sub modules
            const pomObj = element.params;
            if (pomObj.project && pomObj.project.modules && pomObj.project.modules.module && pomObj.project.modules.module.length) {
                const item = new MavenProjectTreeItem("Modules", element.pomXmlFilePath, "Modules", pomObj.project.modules.module);
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            }
            // others
            ['Lifecycle' /*, 'Dependencies' */].forEach(name => {
                const item = new MavenProjectTreeItem(name, element.pomXmlFilePath, name);
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            });
            return Promise.resolve(items);
        }
        else if (element.contextValue == 'Modules') {
            const items = Array.from(element.params, (mod) => Utils.getProject(`${mod}/pom.xml`));
            items.forEach(item => item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg")));
            return Promise.resolve(items);
        }
        else if (element.contextValue == 'Lifecycle') {
            const items = [];
            ['clean', 'validate', 'compile', 'test', 'package', 'verify', 'install', 'site', 'deploy'].forEach(goal => {
                const item = new MavenProjectTreeItem(goal, element.pomXmlFilePath, 'goal');
                item.collapsibleState = 0;
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "goal.svg"));
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