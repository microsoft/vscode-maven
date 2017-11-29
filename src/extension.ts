"use strict";
import * as vscode from "vscode";
import { MavenProjectsTreeDataProvider } from "./mavenProjectsTreeDataProvider";
import { Utils } from "./utils";
import { VSCodeUI } from "./vscodeUI";

const DEFAULT_ARCHETYPE_CATALOG_URL: string = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";

export function activate(context: vscode.ExtensionContext) {
    const mavenProjectsTreeDataProvider = new MavenProjectsTreeDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
        const commandMavenGoal = vscode.commands.registerCommand(`maven.goal.${goal}`, (item) => {
            mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(vscode.commands.registerCommand("maven.projects.refresh", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.goal.exec", (goalItem) => {
        mavenProjectsTreeDataProvider.executeGoal(goalItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.effectivePom", (item) => {
        mavenProjectsTreeDataProvider.effectivePom(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.goal.custom", (item) => {
        mavenProjectsTreeDataProvider.customGoal(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.pinProject", (entry) => {
        mavenProjectsTreeDataProvider.pinProject(entry);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.openPom", (item) => {
        VSCodeUI.openFileIfExists(item.pomXmlFilePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.generate", (entry) => {
        generateFromArchetype(entry);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.updateCache", () => {
        updateLocalArchetypeCatalog();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
    // this method is called when your extension is deactivated
}

async function generateFromArchetype(entry) {
    let cwd: string = null;
    if (entry === undefined) {
        // click on empty part of explorer
        const result = await VSCodeUI.openDialogForFolder({ openLabel: "Select Destination Folder" });
        if (result && result.fsPath) {
            cwd = result.fsPath;
        }
    } else if (entry && entry.scheme === "file") {
        // click on an file/directory entry
        cwd = Utils.nearestDirPath(entry.fsPath);
    }
    const archetypeList = Utils.getArchetypeList();
    const selectedArchetype = await vscode.window.showQuickPick(archetypeList,
        { matchOnDescription: true, placeHolder: "Select archetype with <groupId>:<artifactId> ..." });
    if (selectedArchetype) {
        const { artifactId, groupId, versions } = selectedArchetype;
        const version = await vscode.window.showQuickPick(versions, {placeHolder: "Select version ..."});
        if (version) {
            const cmd = ["mvn archetype:generate",
                `-DarchetypeArtifactId="${artifactId}"`,
                `-DarchetypeGroupId="${groupId}"`,
                `-DarchetypeVersion="${version}"`].join(" ");
            VSCodeUI.runInTerminal(cmd, { cwd, name: "Maven-Archetype" });
        }
    }
}

async function updateLocalArchetypeCatalog() {
    const url = await vscode.window.showInputBox({
        validateInput: (text) => null,
        value: DEFAULT_ARCHETYPE_CATALOG_URL,
    });
    vscode.window.setStatusBarMessage("Updating archetype catalog ... ", Utils.updateArchetypeCache(url));
}
