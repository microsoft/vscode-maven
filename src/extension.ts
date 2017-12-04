"use strict";
import * as vscode from "vscode";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { Utils } from "./utils";
import { VSCodeUI } from "./vscodeUI";

export function activate(context: vscode.ExtensionContext) {
    const mavenProjectsTreeDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal) => {
        const commandMavenGoal = vscode.commands.registerCommand(`maven.goal.${goal}`, (item) => {
            mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.refreshAll", () => {
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
        if (item) {
            VSCodeUI.openFileIfExists(item.pomXmlFilePath);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.generate", (entry) => {
        ArchetypeModule.generateFromArchetype(entry);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.importAll", (entry) => {
        mavenProjectsTreeDataProvider.searchAndPinProjects(entry);
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
    // this method is called when your extension is deactivated
}
