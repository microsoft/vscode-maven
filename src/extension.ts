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
        const commandMavenGoal = vscode.commands.registerCommand(`mavenGoal.${goal}`, (item) => {
            const cmd = `mvn ${goal} -f "${item.pomXmlFilePath}"`;
            VSCodeUI.runInTerminal(cmd, true, `Maven-${item.params.projectName}`);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(vscode.commands.registerCommand("mavenProjects.refresh", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mavenGoal.exec", (goalItem) => {
        mavenProjectsTreeDataProvider.executeGoal(goalItem);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mavenProject.effectivePom", (item) => {
        mavenProjectsTreeDataProvider.effectivePom(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mavenGoal.custom", (item) => {
        mavenProjectsTreeDataProvider.customGoal(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mavenProject.openPom", (item) => {
        VSCodeUI.openFileIfExists(item.pomXmlFilePath);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("mavenArchetype.generate", (entry) => {
        generateFromArchetype(entry);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("mavenArchetype.updateCache", () => {
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
    const selectedArchetype = await vscode.window.showQuickPick(archetypeList, { matchOnDescription: true });
    if (selectedArchetype) {
        const { artifactId, groupId, versions } = selectedArchetype;
        const version = await vscode.window.showQuickPick(versions);
        if (version) {
            const cmd = ["mvn archetype:generate",
                `-DarchetypeArtifactId="${artifactId}"`,
                `-DarchetypeGroupId="${groupId}"`,
                `-DarchetypeVersion="${version}"`].join(" ");
            if (cwd) {
                VSCodeUI.runInTerminal(`cd "${cwd}"`, true, "Maven");
            }
            VSCodeUI.runInTerminal(cmd, true, "Maven");
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
