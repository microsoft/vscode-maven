"use strict";
import * as vscode from "vscode";
import { Uri } from "vscode";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { ProjectItem } from "./ProjectItem";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export function activate(context: vscode.ExtensionContext): void {
    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        const commandMavenGoal: vscode.Disposable = vscode.commands.registerCommand(`maven.goal.${goal}`, (item: ProjectItem | undefined) => {
            mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.refreshAll", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.effectivePom", (item: Uri | ProjectItem | undefined) => {
        mavenProjectsTreeDataProvider.effectivePom(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.goal.custom", (item: ProjectItem | undefined) => {
        mavenProjectsTreeDataProvider.customGoal(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.import", (entry: Uri | undefined) => {
        mavenProjectsTreeDataProvider.importProject(entry);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.openPom", (item: ProjectItem | undefined) => {
        if (item) {
            VSCodeUI.openFileIfExists(item.pomXmlFilePath);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.generate", (entry: Uri | undefined) => {
        ArchetypeModule.generateFromArchetype(entry);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.importAll", () => {
        mavenProjectsTreeDataProvider.searchAndImportProjects();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
