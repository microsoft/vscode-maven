import * as path from "path";
import * as vscode from "vscode";
import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { ProjectItem } from "./ProjectItem";
import { Utils } from "./Utils";
import { VSCodeUI } from "./vscodeUI";

const ENTRY_NEW_GOALS: string = "New ...";
const ENTRY_OPEN_HIST: string = "Edit ...";

export class ProjectDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    public _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem> = new vscode.EventEmitter<vscode.TreeItem>();
    public readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem> = this._onDidChangeTreeData.event;
    private cachedItems: ProjectItem[] = [];

    constructor(protected context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(node?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const element = node as ProjectItem;
        if (element === undefined) {
            const ret = [];
            this.cachedItems = [];
            if (vscode.workspace.workspaceFolders) {
                const maxDepthOfPom = vscode.workspace.getConfiguration("maven.projects")
                    .get<number>("maxDepthOfPom") || 1;
                vscode.workspace.workspaceFolders.forEach((wf) => {
                    Utils.findAllInDir(wf.uri.fsPath, "pom.xml", maxDepthOfPom).forEach((pomxml) => {
                        const item = Utils.getProject(pomxml);
                        if (item) {
                            ret.push(item);
                        }
                    });
                });
            }

            const pinnedPomPaths = vscode.workspace.getConfiguration("maven.projects")
                .get<string[]>("pinnedPomPaths") || [];
            pinnedPomPaths.filter((pom) => !ret.find((value: ProjectItem) => value.pomXmlFilePath === pom))
                .forEach((pom) => {
                    const item = Utils.getProject(pom);
                    if (item) {
                        ret.push(item);
                    }
                });

            ret.forEach((elem) => {
                elem.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
                this.cachedItems.push(elem);
            });
            return Promise.resolve(ret);
        } else if (element.contextValue === "mavenProject") {
            const items = [];
            // sub modules
            const pom = element.params.pom;
            if (pom.project && pom.project.modules) {
                const item = new ProjectItem("Modules", element.pomXmlFilePath, "Modules",
                    { ...element.params, modules: pom.project.modules },
                );
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            }
            // others
            ["Lifecycle" /*, 'Dependencies' */].forEach((name) => {
                const item = new ProjectItem(name, element.pomXmlFilePath, name, element.params);
                item.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(item);
            });
            return Promise.resolve(items);
        } else if (element.contextValue === "Modules") {
            const items = [];
            element.params.modules.forEach((modules) => {
                if (modules.module) {
                    modules.module.forEach((mod) => {
                        const pomxml = path.join(path.dirname(element.pomXmlFilePath), mod.toString(), "pom.xml");
                        const item = Utils.getProject(pomxml);
                        if (item) {
                            item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
                            items.push(item);
                        }
                    });
                }
            });
            // update cached projects
            items.filter(
                (item) => !this.cachedItems.find((value: ProjectItem) => value.pomXmlFilePath === item.pomXmlFilePath))
                .forEach((item) => {
                    this.cachedItems.push(item);
                });
            return Promise.resolve(items);
        } else if (element.contextValue === "Lifecycle") {
            const items = [];
            ["clean",
                "validate",
                "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
                    const item = new ProjectItem(goal, element.pomXmlFilePath, "goal", element.params);
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

    public async executeGoal(projectItem: ProjectItem, goal?: string): Promise<void> {
        const item = projectItem || await VSCodeUI.getQuickPick<ProjectItem>(this.cachedItems, (x) => x.label, (x) => x.pomXmlFilePath);
        if (item) {
            const cmd = `mvn ${goal || item.label} -f "${item.pomXmlFilePath}"`;
            const name = `Maven-${item.params.artifactId}`;
            VSCodeUI.runInTerminal(cmd, { name });
        }
    }

    public async effectivePom(item: ProjectItem | any): Promise<void> {
        const pomXmlFilePath = item.fsPath || item.pomXmlFilePath;
        const p = new Promise<string>((resolve, reject) => {
            const filepath = Utils.getEffectivePomOutputPath(pomXmlFilePath);
            const cmd = `mvn help:effective-pom -f "${pomXmlFilePath}" -Doutput="${filepath}"`;
            Utils.exec(cmd, (error, stdout, stderr) => {
                if (error || stderr) {
                    return resolve(null);
                }
                resolve(filepath);
            });
        });
        vscode.window.setStatusBarMessage("Generating effective pom ... ", p);
        const ret = await p;
        const pomxml = Utils.readFileIfExists(ret);
        if (pomxml) {
            const document = await vscode.workspace.openTextDocument({ language: "xml", content: pomxml });
            vscode.window.showTextDocument(document);
        } else {
            vscode.window.showErrorMessage("Error occurred in generating effective pom.");
        }
    }

    public async customGoal(item: ProjectItem): Promise<void> {
        const cmdlist: string[] = Utils.loadCmdHistory(item.pomXmlFilePath);
        const selectedGoal = await vscode.window.showQuickPick(cmdlist.concat([ENTRY_NEW_GOALS, ENTRY_OPEN_HIST]), {
            placeHolder: "Select the custom command ... ",
        });
        if (selectedGoal === ENTRY_NEW_GOALS) {
            const inputGoals = await vscode.window.showInputBox({ placeHolder: "e.g. clean package -DskipTests" });
            const trimedGoals = inputGoals && inputGoals.trim();
            if (trimedGoals) {
                Utils.saveCmdHistory(item.pomXmlFilePath, Utils.withLRUItemAhead(cmdlist, trimedGoals));
                VSCodeUI.runInTerminal(`mvn ${trimedGoals} -f "${item.pomXmlFilePath}"`,
                    { name: `Maven-${item.params.artifactId}` });
            }
        } else if (selectedGoal === ENTRY_OPEN_HIST) {
            const historicalFilePath = Utils.getCommandHistoryCachePath(item.pomXmlFilePath);
            vscode.window.showTextDocument(vscode.Uri.file(historicalFilePath));
        } else if (selectedGoal) {
            Utils.saveCmdHistory(item.pomXmlFilePath, Utils.withLRUItemAhead(cmdlist, selectedGoal));
            VSCodeUI.runInTerminal(`mvn ${selectedGoal} -f "${item.pomXmlFilePath}"`,
                { name: `Maven-${item.params.artifactId}` });
        }
    }

    public async pinProject(entry) {
        if (entry && entry.scheme === "file") {
            const currentPomXml = entry.fsPath;
            const config = vscode.workspace.getConfiguration("maven.projects");
            const pomXmls = config.get<string[]>("pinnedPomPaths");
            if (pomXmls.indexOf(currentPomXml) < 0) {
                pomXmls.push(currentPomXml);
                await config.update("pinnedPomPaths", pomXmls, false);
            }
        }
        this.refreshTree();
    }
}
