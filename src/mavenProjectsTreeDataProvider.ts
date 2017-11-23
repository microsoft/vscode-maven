import * as path from "path";
import * as vscode from "vscode";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";
import { Utils } from "./utils";

export class MavenProjectsTreeDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem> = new vscode.EventEmitter<vscode.TreeItem>();
    public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem> = this._onDidChangeTreeData.event;

    constructor(protected context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(node?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const element = node as MavenProjectTreeItem;
        if (element === undefined) {
            const ret = [];
            if (vscode.workspace.workspaceFolders) {
                vscode.workspace.workspaceFolders.forEach((wf) => {
                    const basepath = wf.uri.fsPath;
                    const item = Utils.getProject(basepath, "pom.xml");
                    if (item) {
                        item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
                        ret.push(item);
                    }
                });
            }
            return Promise.resolve(ret);
        } else if (element.contextValue === "mavenProject") {
            const items = [];
            // sub modules
            const pomObj = element.params.pom;
            if (pomObj.project && pomObj.project.modules && pomObj.project.modules.module) {
                const pomModule = pomObj.project.modules.module;
                const item = new MavenProjectTreeItem("Modules", element.pomXmlFilePath, "Modules",
                    { ...element.params, modules: Array.isArray(pomModule) ? pomModule : [pomModule] },
                );
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            }
            // others
            ["Lifecycle" /*, 'Dependencies' */].forEach((name) => {
                const item = new MavenProjectTreeItem(name, element.pomXmlFilePath, name, element.params);
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            });
            return Promise.resolve(items);
        } else if (element.contextValue === "Modules") {
            const items = Array.from(element.params.modules, (mod) => Utils.getProject(path.dirname(element.pomXmlFilePath), `${mod}/pom.xml`)).filter((x) => x);
            items.forEach((item) => item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg")));
            return Promise.resolve(items);
        } else if (element.contextValue === "Lifecycle") {
            const items = [];
            ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
                const item = new MavenProjectTreeItem(goal, element.pomXmlFilePath, "goal", element.params);
                item.collapsibleState = 0;
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "goal.svg"));
                items.push(item);
            });
            return Promise.resolve(items);
        } else if (element.contextValue === "Dependencies") {
            const items = [];
            // TODO
            return Promise.resolve(items);
        }
    }
    public refreshTree(): void {
        this._onDidChangeTreeData.fire();
    }
}
