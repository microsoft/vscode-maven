"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectItem } from "./model/ProjectItem";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { VSCodeUI } from "./VSCodeUI";

export function activate(context: vscode.ExtensionContext): void {
    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        const commandMavenGoal: vscode.Disposable = vscode.commands.registerCommand(`maven.goal.${goal}`, (item: ProjectItem) => {
            mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.refreshAll", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.effectivePom", (item: Uri | ProjectItem) => {
        mavenProjectsTreeDataProvider.effectivePom(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.goal.custom", (item: ProjectItem) => {
        mavenProjectsTreeDataProvider.customGoal(item);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.project.openPom", (item: ProjectItem) => {
        if (item) {
            VSCodeUI.openFileIfExists(item.abosolutePath);
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.generate", (entry: Uri | undefined) => {
        ArchetypeModule.generateFromArchetype(entry);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("maven.archetype.update", () => {
        vscode.window.withProgress({location: vscode.ProgressLocation.Window}, async (p: Progress<{}>) => {
            p.report({message: "updating archetype catalog ..."});
            await ArchetypeModule.updateArchetypeCatalog();
            p.report({message: "finished."});
        });
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
