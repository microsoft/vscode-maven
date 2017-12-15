
import { exec } from "child_process";
import * as path from "path";
import { Event, EventEmitter, ExtensionContext, TextDocument, TreeDataProvider, TreeItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { FolderItem } from "./model/FolderItem";
import { ProjectItem } from "./model/ProjectItem";
import { WorkspaceItem } from "./model/WorkspaceItem";
import { IPomModule, IPomModules, IPomRoot } from "./model/XmlSchema";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

const ENTRY_NEW_GOALS: string = "New ...";
const ENTRY_OPEN_HIST: string = "Edit ...";
const ITEM_NO_AVAILABLE_PROJECTS: string = "No maven projects found.";

export class ProjectDataProvider implements TreeDataProvider<TreeItem> {

    public _onDidChangeTreeData: EventEmitter<TreeItem> = new EventEmitter<TreeItem>();
    public readonly onDidChangeTreeData: Event<TreeItem> = this._onDidChangeTreeData.event;
    protected context: ExtensionContext;

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    public getTreeItem(element: TreeItem): TreeItem {
        return element;
    }

    public async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (element === undefined) {
            if (workspace.workspaceFolders) {
                return workspace.workspaceFolders.map((wf: WorkspaceFolder) => new WorkspaceItem(wf.name, wf.uri.fsPath));
            } else {
                return [];
            }
        } else if (element.contextValue === "WorkspaceItem") {
            const workspaceItem: WorkspaceItem = <WorkspaceItem> element;
            const depth: number = workspace.getConfiguration("maven.projects").get<number>("maxDepthOfPom");
            const exclusions: string[] = workspace.getConfiguration("maven.projects").get<string[]>("excludedFolders");
            const foundPomXmls: string[] = await Utils.findAllInDir(workspaceItem.abosolutePath, "pom.xml", depth, exclusions);
            const promiseList: Promise<ProjectItem>[] = foundPomXmls.map((pomXmlFilePath: string) => Utils.getProject(pomXmlFilePath, workspaceItem.abosolutePath, this.context.asAbsolutePath(path.join("resources", "project.svg"))));
            const items: ProjectItem[] = (await Promise.all(promiseList)).filter((x: ProjectItem) => x);
            items.forEach((item: ProjectItem) => {
                item.workspacePath = workspaceItem.abosolutePath;
            });
            if (items.length === 0) {
                return [new TreeItem(ITEM_NO_AVAILABLE_PROJECTS)];
            }
            return items;
        } else if (element.contextValue === "ProjectItem") {
            const projectItem: ProjectItem = <ProjectItem> element;
            const items: FolderItem[] = [];
            // sub modules
            const pom: IPomRoot = projectItem.params.pom;
            if (pom.project && pom.project.modules) {
                const modulesFolderItem: FolderItem = new FolderItem(
                    "Modules",
                    FolderItem.ContextValue.Modules,
                    projectItem.abosolutePath,
                    projectItem.workspacePath,
                    { ...projectItem.params, modules: pom.project.modules }
                );
                modulesFolderItem.iconPath = this.context.asAbsolutePath(path.join("resources", "folder.svg"));
                items.push(modulesFolderItem);
            }
            return items;
        } else if (element.contextValue === FolderItem.ContextValue.Modules) {
            const modulesFolderItem: FolderItem = <FolderItem> element;
            const pomXmlFilePaths: string[] = [];
            modulesFolderItem.params.modules.forEach((modules: IPomModules) => {
                if (modules.module) {
                    modules.module.forEach((mod: IPomModule) => {
                        const pomxml: string = path.join(path.dirname(modulesFolderItem.parentAbsolutePath), mod.toString(), "pom.xml");
                        pomXmlFilePaths.push(pomxml);
                    });
                }
            });
            const promiseList: Promise<ProjectItem>[] = pomXmlFilePaths.map((pomXmlFilePath: string) => Utils.getProject(pomXmlFilePath, modulesFolderItem.workspacePath, this.context.asAbsolutePath(path.join("resources", "project.svg"))));
            const items: ProjectItem[] = (await Promise.all(promiseList)).filter((x: ProjectItem) => x);
            items.forEach((item: ProjectItem) => {
                item.workspacePath = modulesFolderItem.workspacePath;
            });
            return items;
        } else {
            return [];
        }
    }

    public refreshTree(): void {
        this._onDidChangeTreeData.fire();
    }

    public async executeGoal(item: ProjectItem, goal?: string): Promise<void> {
        if (item) {
            const cmd: string = `"${Utils.getMavenExecutable()}" ${goal || item.label} -f "${item.abosolutePath}"`;
            const name: string = `Maven-${item.artifactId}`;
            VSCodeUI.runInTerminal(cmd, { name });
        }
    }

    public async effectivePom(item: Uri | ProjectItem): Promise<void> {
        let pomXmlFilePath: string = null;
        if (item instanceof Uri) {
            pomXmlFilePath = item.fsPath;
        } else if (item instanceof ProjectItem) {
            pomXmlFilePath = item.abosolutePath;
        }
        if (!pomXmlFilePath) {
            return;
        }
        const promise: Promise<string> = new Promise<string>(
            (resolve: (value: string) => void, _reject: (e: Error) => void): void => {
                const filepath: string = Utils.getEffectivePomOutputPath(pomXmlFilePath);
                const cmd: string = `"${Utils.getMavenExecutable()}" help:effective-pom -f "${pomXmlFilePath}" -Doutput="${filepath}"`;
                exec(cmd, (error: Error, _stdout: string, stderr: string): void => {
                    if (error || stderr) {
                        return resolve(null);
                    }
                    resolve(filepath);
                });
            }
        );
        window.setStatusBarMessage("Generating effective pom ... ", promise);
        const ret: string = await promise;
        const pomxml: string = await Utils.readFileIfExists(ret);
        if (pomxml) {
            const document: TextDocument = await workspace.openTextDocument({ language: "xml", content: pomxml });
            window.showTextDocument(document);
        } else {
            window.showErrorMessage("Error occurred in generating effective pom.");
        }
    }

    public async customGoal(item: ProjectItem): Promise<void> {
        if (!item || !item.abosolutePath) {
            return;
        }
        const cmdlist: string[] = await Utils.loadCmdHistory(item.abosolutePath);
        const selectedGoal: string = await window.showQuickPick(cmdlist.concat([ENTRY_NEW_GOALS, ENTRY_OPEN_HIST]), {
            placeHolder: "Select the custom command ... "
        });
        if (selectedGoal === ENTRY_NEW_GOALS) {
            const inputGoals: string = await window.showInputBox({ placeHolder: "e.g. clean package -DskipTests" });
            const trimedGoals: string = inputGoals && inputGoals.trim();
            if (trimedGoals) {
                await Utils.saveCmdHistory(item.abosolutePath, Utils.withLRUItemAhead(cmdlist, trimedGoals));
                VSCodeUI.runInTerminal(
                    `"${Utils.getMavenExecutable()}" ${trimedGoals} -f "${item.abosolutePath}"`,
                    { name: `Maven-${item.artifactId}` }
                );
            }
        } else if (selectedGoal === ENTRY_OPEN_HIST) {
            const historicalFilePath: string = Utils.getCommandHistoryCachePath(item.abosolutePath);
            window.showTextDocument(Uri.file(historicalFilePath));
        } else if (selectedGoal) {
            await Utils.saveCmdHistory(item.abosolutePath, Utils.withLRUItemAhead(cmdlist, selectedGoal));
            VSCodeUI.runInTerminal(
                `"${Utils.getMavenExecutable()}" ${selectedGoal} -f "${item.abosolutePath}"`,
                { name: `Maven-${item.artifactId}` }
            );
        }
    }
}
