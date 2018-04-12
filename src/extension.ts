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

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));

    // close all terminals with outdated Envs
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (e.affectsConfiguration("maven.terminal.useJavaHome") || e.affectsConfiguration("maven.terminal.customEnv")) {
            VSCodeUI.closeAllTerminals();
        } else {
            const useJavaHome: boolean = vscode.workspace.getConfiguration("maven").get<boolean>("terminal.useJavaHome");
            if (useJavaHome && e.affectsConfiguration("java.home")) {
                VSCodeUI.closeAllTerminals();
            }
        }
    });
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
