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

    constructor(protected context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(node?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        const element = node as ProjectItem;
        if (element === undefined) {
            const ret = [];
            if (vscode.workspace.workspaceFolders) {
                vscode.workspace.workspaceFolders.forEach((wf) => {
                    const item = Utils.getProject(path.join(wf.uri.fsPath, "pom.xml"));
                    if (item) {
                        item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
                        ret.push(item);
                    }
                });
            }
            const config = vscode.workspace.getConfiguration("maven.projects").get<string[]>("pinnedPomPaths") || [];
            config.filter((pom) => !ret.find((value: ProjectItem) => value.pomXmlFilePath === pom))
                .forEach((pom) => {
                    const item = Utils.getProject(pom);
                    if (item) {
                        item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg"));
                        ret.push(item);
                    }
                });
            return Promise.resolve(ret);
        } else if (element.contextValue === "mavenProject") {
            const items = [];
            // sub modules
            const pomObj = element.params.pom;
            if (pomObj.project && pomObj.project.modules && pomObj.project.modules.module) {
                const pomModule = pomObj.project.modules.module;
                const item = new ProjectItem("Modules", element.pomXmlFilePath, "Modules",
                    { ...element.params, modules: Array.isArray(pomModule) ? pomModule : [pomModule] },
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
            const items = Array.from(element.params.modules,
                (mod: string) => {
                    const pomxml = path.join(path.dirname(element.pomXmlFilePath), mod, "pom.xml");
                    return Utils.getProject(pomxml);
                }).filter((x) => x);
            items.forEach((item) => item.iconPath = this.context.asAbsolutePath(path.join("resources", "project.svg")));
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

    public executeGoal(item: ProjectItem, goal?: string): void {
        const cmd = `mvn ${goal || item.label} -f "${item.pomXmlFilePath}"`;
        const name = `Maven-${item.params.artifactId}`;
        VSCodeUI.runInTerminal(cmd, { name });
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
