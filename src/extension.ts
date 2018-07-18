// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./archetype/ArchetypeModule";
import { MavenExplorerProvider } from "./explorer/MavenExplorerProvider";
import { MavenProjectNode } from "./explorer/model/MavenProjectNode";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    // Usage data statistics.
    if (Utils.getAiKey()) {
        TelemetryWrapper.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
    }

    vscode.commands.executeCommand("setContext", "mavenExtensionActivated", true);

    const provider: MavenExplorerProvider = new MavenExplorerProvider();
    vscode.window.registerTreeDataProvider("mavenProjects", provider);

    // pom.xml listener to refresh tree view
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/pom.xml");
    watcher.onDidCreate(() => provider.refresh());
    watcher.onDidChange(() => provider.refresh());
    watcher.onDidDelete(() => provider.refresh());
    context.subscriptions.push(watcher);

    // register commands.
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        context.subscriptions.push(TelemetryWrapper.registerCommand(`maven.goal.${goal}`, async (node: MavenProjectNode) => {
            Utils.executeInTerminal(goal, node.pomPath);
        }));
    });

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.refreshAll", (): void => {
        provider.refresh();
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.effectivePom", async (node: Uri | MavenProjectNode) => {
        if (node instanceof Uri && node.fsPath) {
            await Utils.showEffectivePom(node.fsPath);
        } else if (node instanceof MavenProjectNode && node.pomPath) {
            await Utils.showEffectivePom(node.pomPath);
        }
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.goal.custom", async (node: MavenProjectNode) => {
        if (node && node.pomPath) {
            await Utils.excuteCustomGoal(node.pomPath);
        }
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.project.openPom", async (node: MavenProjectNode) => {
        if (node && node.pomPath) {
            await VSCodeUI.openFileIfExists(node.pomPath);
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

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.history", async (item: MavenProjectNode | undefined) => {
        if (item) {
            await Utils.executeHistoricalGoals([item.pomPath]);
        } else {
            await Utils.executeHistoricalGoals(provider.mavenProjectNodes.map(_node => _node.pomPath));
        }
    }));

    context.subscriptions.push(TelemetryWrapper.registerCommand("maven.goal.execute", async () => {
        await Utils.executeMavenCommand(provider);
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
    const workspaceFolders: vscode.WorkspaceFolder[] = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length) {
        const errors: any = {};
        for (const workspaceFolder of workspaceFolders) {
            try {
                const pomPaths: string[] = await Utils.getAllPomPaths(workspaceFolder);
                if (pomPaths && pomPaths.length) {
                    await Utils.executeInBackground("--version", null, workspaceFolder);
                }
            } catch (error) {
                errors[workspaceFolder.name] = error;
            }
        }
        if (Object.keys(errors).length > 0) {
            const OPTION_SHOW_FAQS: string = "Show FAQs";
            const OPTION_OPEN_SETTINGS: string = "Open Settings";
            const MESSAGE_MAVEN_ERROR: string = "Unable to execute Maven commands.";
            // TODO: show more detailed info. e.g. which workspace fail the command.
            const choiceForDetails: string = await vscode.window.showErrorMessage(`${MESSAGE_MAVEN_ERROR}\n`, OPTION_OPEN_SETTINGS, OPTION_SHOW_FAQS);
            if (choiceForDetails === OPTION_SHOW_FAQS) {
                // open FAQs
                const readmeFilePath: string = Utils.getPathToExtensionRoot("FAQs.md");
                vscode.commands.executeCommand("markdown.showPreview", vscode.Uri.file(readmeFilePath));
            } else if (choiceForDetails === OPTION_OPEN_SETTINGS) {
                vscode.commands.executeCommand("workbench.action.openSettings");
            }
        }
    }
}
