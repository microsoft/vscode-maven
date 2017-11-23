"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { exec, execSync, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { MavenProjectsTreeDataProvider } from "./mavenProjectsTreeDataProvider";
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";
import { Utils } from "./utils";

const ENTRY_NEW_GOALS: string = "New ...";
const ENTRY_OPEN_HIST: string = "View all historical commands";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const mavenProjectsTreeDataProvider = new MavenProjectsTreeDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    const commandMavenProjectsRefresh = vscode.commands.registerCommand("mavenProjects.refresh", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    });
    const commandMavenGoalExecute = vscode.commands.registerCommand("mavenGoal.exec", (goalItem) => {
        const item = goalItem as MavenProjectTreeItem;
        Utils.runInTerminal(`mvn ${item.label} -f "${item.pomXmlFilePath}"`, true, `Maven-${item.params.projectName}`);
    });

    const commandMavenProjectEffectivePom = vscode.commands.registerCommand("mavenProject.effectivePom", (item) => {
        const pomXmlFilePath = item.fsPath || item.pomXmlFilePath;
        const filepath = Utils.getEffectivePomOutputPath(pomXmlFilePath);
        const p = new Promise((resolve, reject) => {
            exec(`mvn help:effective-pom -f "${pomXmlFilePath}" -Doutput="${filepath}"`, (error, stdout, stderr) => {
                if (error || stderr) {
                    return resolve(false);
                }
                resolve(true);
            });
        }).then((ret) => {
            if (ret && fs.existsSync(filepath)) {
                const pomxml = fs.readFileSync(filepath).toString();
                vscode.workspace.openTextDocument({ language: "xml", content: pomxml }).then((document) => {
                    vscode.window.showTextDocument(document);
                });
            } else {
                vscode.window.showErrorMessage("Error occurred in generating effective pom.");
            }
        });
        vscode.window.setStatusBarMessage("Generating effective pom ... ", p);
    });

    const commandMavenProjectOpenPom = vscode.commands.registerCommand("mavenProject.openPom", (projectItem) => {
        const item = projectItem as MavenProjectTreeItem;
        if (fs.existsSync(item.pomXmlFilePath)) {
            vscode.window.showTextDocument(vscode.Uri.file(item.pomXmlFilePath), { preview: false });
        }
    });

    const commandMavenCustomGoal = vscode.commands.registerCommand("mavenGoal.custom", (goalItem) => {
        const item = goalItem as MavenProjectTreeItem;
        const cmdlist: string[] = Utils.loadCmdHistory(item.pomXmlFilePath);
        vscode.window.showQuickPick(cmdlist.concat([ENTRY_NEW_GOALS, ENTRY_OPEN_HIST])).then((selected) => {
            if (selected) {
                if (selected === ENTRY_NEW_GOALS) {
                    vscode.window.showInputBox().then((cmd) => {
                        if (cmd && cmd.trim()) {
                            cmd = cmd.trim();
                            Utils.saveCmdHistory(item.pomXmlFilePath, Utils.withLRUItemAhead(cmdlist, cmd));
                            Utils.runInTerminal(`mvn ${cmd} -f "${item.pomXmlFilePath}"`, true,
                                `Maven-${item.params.projectName}`);
                        }
                    });
                } else if (selected === ENTRY_OPEN_HIST) {
                    const historicalFilePath = Utils.getCommandHistoryCachePath(item.pomXmlFilePath);
                    vscode.window.showTextDocument(vscode.Uri.file(historicalFilePath));
                } else {
                    Utils.saveCmdHistory(item.pomXmlFilePath, Utils.withLRUItemAhead(cmdlist, selected));
                    Utils.runInTerminal(`mvn ${selected} -f "${item.pomXmlFilePath}"`, true,
                        `Maven-${item.params.projectName}`);
                }
            }
        });
    });

    const commandMavenArchetypeGenerate = vscode.commands.registerCommand("mavenArchetype.generate", () => {
        const archetypeList = Utils.getArchetypeList();
        vscode.window.showQuickPick(archetypeList, { matchOnDescription: true }).then((selected) => {
            if (selected) {
                const { artifactId, groupId } = selected;
                vscode.window.showQuickPick(selected.versions).then((version) => {
                    if (version) {
                        const cmd = `mvn archetype:generate -DarchetypeArtifactId=${artifactId} -DarchetypeGroupId=${groupId} -DarchetypeVersion=${version}`;
                        Utils.runInTerminal(cmd, true, "Maven");
                    }
                });
            }
        });
    });

    const commandMavenArchetypeUpdateCache = vscode.commands.registerCommand("mavenArchetype.updateCache", () => {
        const defaultCatalogUrl = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";
        vscode.window.showInputBox({ value: defaultCatalogUrl }).then((url) => {
            vscode.window.setStatusBarMessage("Updating archetype catalog ... ", Utils.updateArchetypeCache(url));
        });
    });

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
        const commandMavenGoal = vscode.commands.registerCommand(`mavenGoal.${goal}`, (goalItem) => {
            const item = goalItem as MavenProjectTreeItem;
            Utils.runInTerminal(`mvn ${goal} -f "${item.pomXmlFilePath}"`, true, `Maven-${item.params.projectName}`);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(commandMavenProjectsRefresh);
    context.subscriptions.push(commandMavenGoalExecute);
    context.subscriptions.push(commandMavenProjectEffectivePom);
    context.subscriptions.push(commandMavenProjectOpenPom);
    context.subscriptions.push(commandMavenArchetypeGenerate);
    context.subscriptions.push(commandMavenArchetypeUpdateCache);
}

export function deactivate() {
    // this method is called when your extension is deactivated
}
