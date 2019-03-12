// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./archetype/ArchetypeModule";
import { completionProvider } from "./completion/completionProvider";
import { OperationCanceledError } from "./Errors";
import { mavenExplorerProvider } from "./explorer/mavenExplorerProvider";
import { ITreeItem } from "./explorer/model/ITreeItem";
import { MavenProject } from "./explorer/model/MavenProject";
import { PluginGoal } from "./explorer/model/PluginGoal";
import { pluginInfoProvider } from "./explorer/pluginInfoProvider";
import { addDependencyHandler } from "./handlers/addDependencyHandler";
import { runFavoriteCommandsHandler } from "./handlers/runFavoriteCommandsHandler";
import {hoverProvider} from "./hover/hoverProvider";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { mavenTerminal } from "./mavenTerminal";
import { Settings } from "./Settings";
import { taskExecutor } from "./taskExecutor";
import { getAiKey, getExtensionId, getExtensionVersion, loadPackageInfo } from "./utils/contextUtils";
import { executeInTerminal } from "./utils/mavenUtils";
import { openFileIfExists, showTroubleshootingDialog } from "./utils/uiUtils";
import { Utils } from "./utils/Utils";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await loadPackageInfo(context);
    // Usage data statistics.
    if (getAiKey()) {
        initialize(getExtensionId(), getExtensionVersion(), getAiKey());
    }
    await instrumentOperation("activation", doActivate)(context);
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

function registerCommand(context: vscode.ExtensionContext, commandName: string, func: (...args: any[]) => any, withOperationIdAhead?: boolean): void {
    const callbackWithTroubleshooting: (...args: any[]) => any = instrumentOperation(commandName, async (_operationId: string, ...args: any[]) => {
        try {
            return withOperationIdAhead ? await func(_operationId, ...args) : await func(...args);
        } catch (error) {
            if (error instanceof OperationCanceledError) {
                // swallow
            } else {
                await showTroubleshootingDialog(`Command "${commandName}" fails. ${error.message}`);
            }
            throw error;
        }
    });
    context.subscriptions.push(vscode.commands.registerCommand(commandName, callbackWithTroubleshooting));
}

async function doActivate(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    pluginInfoProvider.initialize(context);
    // register tree view
    context.subscriptions.push(vscode.window.registerTreeDataProvider("mavenProjects", mavenExplorerProvider));
    // pom.xml listener to refresh tree view
    registerPomFileWatcher(context);
    // register output, terminal, taskExecutor
    context.subscriptions.push(mavenOutputChannel, mavenTerminal, taskExecutor);
    // register common goals
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        registerCommand(context, `maven.goal.${goal}`, async (node: MavenProject) => executeInTerminal(goal, node.pomPath));
    });
    registerCommand(context, "maven.explorer.refresh", async (item?: ITreeItem): Promise<void> => {
        if (item && item.refresh) {
            await item.refresh();
        } else {
            mavenExplorerProvider.refresh(item);
        }
    });
    registerCommand(context, "maven.project.effectivePom", async (projectOrUri: Uri | MavenProject) => await Utils.showEffectivePom(projectOrUri));
    registerCommand(context, "maven.goal.custom", async (node: MavenProject) => await Utils.executeCustomGoal(node.pomPath));
    registerCommand(context, "maven.project.openPom", async (node: MavenProject) => {
        if (node && node.pomPath) {
            await openFileIfExists(node.pomPath);
        }
    });
    registerCommand(context, "maven.archetype.generate", async (operationId: string, entry: Uri | undefined) => {
        await ArchetypeModule.generateFromArchetype(entry, operationId);
    }, true);
    registerCommand(context, "maven.archetype.update", async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, async (p: Progress<{}>) => {
            p.report({ message: "updating archetype catalog ..." });
            await ArchetypeModule.updateArchetypeCatalog();
            p.report({ message: "finished." });
        });
    });
    registerCommand(context, "maven.history", async (item: MavenProject | undefined) => {
        if (item) {
            await Utils.executeHistoricalGoals([item.pomPath]);
        } else {
            await Utils.executeHistoricalGoals(mavenExplorerProvider.mavenProjectNodes.map(_node => _node.pomPath));
        }
    });
    registerCommand(context, "maven.favorites", async (item: MavenProject | undefined) => await runFavoriteCommandsHandler(item));
    registerCommand(context, "maven.goal.execute", async () => await Utils.executeMavenCommand());
    registerCommand(context, "maven.plugin.execute", async (pluginGoal: PluginGoal) => await executeInTerminal(pluginGoal.name, pluginGoal.plugin.project.pomPath));
    registerCommand(context, "maven.view.flat", () => Settings.changeToFlatView());
    registerCommand(context, "maven.view.hierarchical", () => Settings.changeToHierarchicalView());

    registerConfigChangeListner(context);
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
            mavenTerminal.onDidCloseTerminal(closedTerminal);
        }),
        // workspace folder change listener
        vscode.workspace.onDidChangeWorkspaceFolders((_e: vscode.WorkspaceFoldersChangeEvent) => {
            mavenExplorerProvider.refresh();
        })
    );
    const pomSelector: vscode.DocumentSelector = [{ language: "xml", scheme: "file", pattern: "**/pom.xml" }];
    // completion item provider
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(pomSelector, completionProvider, ".", "-"));
    registerCommand(context, "maven.completion.selected", sendInfo, true);

    registerCommand(context, "maven.project.addDependency", async () => await addDependencyHandler());
    // hover
    context.subscriptions.push(vscode.languages.registerHoverProvider(pomSelector, hoverProvider));
}

function registerPomFileWatcher(context: vscode.ExtensionContext): void {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/pom.xml");
    watcher.onDidCreate((e: Uri) => mavenExplorerProvider.addProject(e.fsPath), null, context.subscriptions);
    watcher.onDidChange(async (e: Uri) => mavenExplorerProvider.getMavenProject(e.fsPath).refresh(), null, context.subscriptions);
    watcher.onDidDelete((e: Uri) => mavenExplorerProvider.removeProject(e.fsPath), null, context.subscriptions);
    context.subscriptions.push(watcher);
}

function registerConfigChangeListner(context: vscode.ExtensionContext): void {
    const configChangeListener: vscode.Disposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        // close all terminals with outdated JAVA related environment variables
        if (e.affectsConfiguration("maven.terminal.useJavaHome")
            || e.affectsConfiguration("maven.terminal.customEnv")
            || Settings.Terminal.useJavaHome() && e.affectsConfiguration("java.home")
        ) {
            mavenTerminal.closeAllTerminals();
        } else if (e.affectsConfiguration("maven.view")) {
            mavenExplorerProvider.refresh();
        }
    });
    context.subscriptions.push(configChangeListener);
}
