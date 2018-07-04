// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectItem } from "./model/ProjectItem";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    // Usage data statistics.
    if (Utils.getAiKey()) {
        TelemetryWrapper.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
    }

    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    // pom.xml listener to refresh tree view
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/pom.xml");
    watcher.onDidCreate(() => mavenProjectsTreeDataProvider.refreshTree());
    watcher.onDidChange(() => mavenProjectsTreeDataProvider.refreshTree());
    watcher.onDidDelete(() => mavenProjectsTreeDataProvider.refreshTree());
    context.subscriptions.push(watcher);

    // register commands.
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        context.subscriptions.push(TelemetryWrapper.registerCommand(`maven.goal.${goal}`, async (item: ProjectItem) => {
            await mavenProjectsTreeDataProvider.executeGoal(item, goal);
        }));
    });

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.refreshAll", (): void => {
        mavenProjectsTreeDataProvider.refreshTree();
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.effectivePom", async (item: Uri | ProjectItem) => {
        await mavenProjectsTreeDataProvider.effectivePom(item);
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.goal.custom", async (item: ProjectItem) => {
        await mavenProjectsTreeDataProvider.customGoal(item);
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.openPom", async (item: ProjectItem) => {
        if (item) {
            await VSCodeUI.openFileIfExists(item.abosolutePath);
        }
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.archetype.generate", async (entry: Uri | undefined) => {
        await ArchetypeModule.generateFromArchetype(entry);
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.archetype.update", async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: Progress<{}>) => {
            p.report({ message: "updating archetype catalog ..." });
            await ArchetypeModule.updateArchetypeCatalog();
            p.report({ message: "finished." });
        });
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.history", async (item: ProjectItem | undefined) => {
        await mavenProjectsTreeDataProvider.historicalGoals(item && item.abosolutePath);
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.goal.execute", async () => {
        await mavenProjectsTreeDataProvider.execute();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));

    // configuration change listener
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        // close all terminals with outdated JAVA related Envs
        if (e.affectsConfiguration("maven.terminal.useJavaHome") || e.affectsConfiguration("maven.terminal.customEnv")) {
            VSCodeUI.closeAllTerminals();
        } else {
            const useJavaHome: boolean = vscode.workspace.getConfiguration("maven").get<boolean>("terminal.useJavaHome");
            if (useJavaHome && e.affectsConfiguration("java.home")) {
                VSCodeUI.closeAllTerminals();
            }
        }
        checkMavenAvailablility();
    });

    // check maven executable file
    checkMavenAvailablility();
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}

// private helpers
async function checkMavenAvailablility(): Promise<void> {
    try {
        await Utils.getMavenVersion();
    } catch (error) {
        const OPTION_SHOW_DETAILS: string = "Show details";
        const OPTION_GUIDE: string = "Guidance";
        const choiceForDetails: string = await vscode.window.showErrorMessage("Unable to execute Maven commands. Please make sure Maven is either in the PATH, or that 'maven.executable.path' is pointed to its installed location. Also make sure JAVA_HOME is specified either in environment variables or settings.", OPTION_SHOW_DETAILS);
        if (choiceForDetails === OPTION_SHOW_DETAILS) {
            const choiceForGuide: string = await vscode.window.showErrorMessage(error.message, OPTION_GUIDE);
            if (choiceForGuide === OPTION_GUIDE) {
                // open FAQ
                const readmeFilePath: string = Utils.getPathToExtensionRoot("FAQ.md");
                vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(readmeFilePath));
            }
        }
    }

}
