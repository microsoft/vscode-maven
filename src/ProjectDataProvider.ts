// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";
import * as path from "path";
import { Event, EventEmitter, ExtensionContext, Progress, ProgressLocation, TextDocument, TreeDataProvider, TreeItem, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { FolderItem } from "./model/FolderItem";
import { ProjectItem } from "./model/ProjectItem";
import { WorkspaceItem } from "./model/WorkspaceItem";
import { IPomModule, IPomModules, IPomRoot } from "./model/XmlSchema";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

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
            const workspaceItem: WorkspaceItem = <WorkspaceItem>element;
            const depth: number = workspace.getConfiguration("maven.projects").get<number>("maxDepthOfPom");
            const exclusions: string[] = workspace.getConfiguration("maven.projects", Uri.file(workspaceItem.abosolutePath)).get<string[]>("excludedFolders");
            const foundPomXmls: string[] = await Utils.findAllInDir(workspaceItem.abosolutePath, "pom.xml", depth, exclusions);
            const promiseList: Promise<ProjectItem>[] = foundPomXmls.map((pomXmlFilePath: string) => Utils.getProject(pomXmlFilePath, workspaceItem.abosolutePath));
            const items: ProjectItem[] = (await Promise.all(promiseList)).filter((x: ProjectItem) => x);
            items.forEach((item: ProjectItem) => {
                item.workspacePath = workspaceItem.abosolutePath;
            });
            if (items.length === 0) {
                return [new TreeItem(ITEM_NO_AVAILABLE_PROJECTS)];
            }
            return items;
        } else if (element.contextValue === "ProjectItem") {
            const projectItem: ProjectItem = <ProjectItem>element;
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
                items.push(modulesFolderItem);
            }
            return items;
        } else if (element.contextValue === FolderItem.ContextValue.Modules) {
            const modulesFolderItem: FolderItem = <FolderItem>element;
            const pomXmlFilePaths: string[] = [];
            modulesFolderItem.params.modules.forEach((modules: IPomModules) => {
                if (modules.module) {
                    modules.module.forEach((mod: IPomModule) => {
                        const pomxml: string = path.join(path.dirname(modulesFolderItem.parentAbsolutePath), mod.toString(), "pom.xml");
                        pomXmlFilePaths.push(pomxml);
                    });
                }
            });
            const promiseList: Promise<ProjectItem>[] = pomXmlFilePaths.map((pomXmlFilePath: string) => Utils.getProject(pomXmlFilePath, modulesFolderItem.workspacePath));
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

    public async executeGoal(item: ProjectItem, goal: string): Promise<void> {
        if (item) {
            Utils.executeMavenCommand(goal, item.abosolutePath);
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
        const ret: string = await window.withProgress({ location: ProgressLocation.Window }, (p: Progress<{ message?: string }>) => new Promise<string>(
            (resolve: (value: string) => void, reject: (e: Error) => void): void => {
                p.report({ message: "Generating effective pom ... " });
                const filepath: string = Utils.getEffectivePomOutputPath(pomXmlFilePath);
                const cmd: string = [
                    Utils.getMavenExecutable(),
                    "help:effective-pom",
                    "-f",
                    `"${pomXmlFilePath}"`,
                    `-Doutput="${filepath}"`
                ].join(" ");
                const rootfolder: WorkspaceFolder = workspace.getWorkspaceFolder(Uri.file(pomXmlFilePath));
                const customEnv: {} = VSCodeUI.setupEnvironment();
                const execOptions: child_process.ExecOptions = {
                    cwd: rootfolder ? rootfolder.uri.fsPath : path.dirname(pomXmlFilePath),
                    env: Object.assign({}, process.env, customEnv)
                };
                child_process.exec(cmd, execOptions, (error: Error, _stdout: string, _stderr: string): void => {
                    if (error) {
                        window.showErrorMessage(`Error occurred in generating effective pom.\n${error}`);
                        reject(error);
                    } else {
                        resolve(filepath);
                    }
                });
            }
        ));
        const pomxml: string = await Utils.readFileIfExists(ret);
        if (pomxml) {
            const document: TextDocument = await workspace.openTextDocument({ language: "xml", content: pomxml });
            window.showTextDocument(document);
        }
    }

    public async customGoal(item: ProjectItem): Promise<void> {
        if (!item || !item.abosolutePath) {
            return;
        }
        const inputGoals: string = await window.showInputBox({ placeHolder: "e.g. clean package -DskipTests", ignoreFocusOut: true });
        const trimedGoals: string = inputGoals && inputGoals.trim();
        if (trimedGoals) {
            Utils.executeMavenCommand(trimedGoals, item.abosolutePath);
        }
    }

    public async historicalGoals(): Promise<void> {
        const selected: IHistory = await VSCodeUI.getQuickPick(
            Utils.getLRUCommands(),
            (x: IHistory) => x.command,
            null,
            (x: IHistory) => x.pomfile,
            { placeHolder: "Select from history ... " }
        );
        if (selected) {
            const command: string = selected.command;
            const pomfile: string = selected.pomfile;
            Utils.executeMavenCommand(command, pomfile);
        }
    }
}

interface IHistory {
    command: string;
    pomfile: string;
}
