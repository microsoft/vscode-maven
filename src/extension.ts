// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./archetype/ArchetypeModule";
import { registerArtifactSearcher } from "./artifactSearcher";
import { completionProvider } from "./completion/completionProvider";
import { OperationCanceledError } from "./Errors";
import { mavenExplorerProvider } from "./explorer/mavenExplorerProvider";
import { ITreeItem } from "./explorer/model/ITreeItem";
import { MavenProject } from "./explorer/model/MavenProject";
import { PluginGoal } from "./explorer/model/PluginGoal";
import { pluginInfoProvider } from "./explorer/pluginInfoProvider";
import { addDependencyHandler } from "./handlers/addDependencyHandler";
import { debugHandler } from "./handlers/debugHandler";
import { runFavoriteCommandsHandler } from "./handlers/runFavoriteCommandsHandler";
import { showDependenciesHandler } from "./handlers/showDependenciesHandler";
import { hoverProvider } from "./hover/hoverProvider";
import { isJavaExtEnabled } from "./jdtls/commands";
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
        initialize(getExtensionId(), getExtensionVersion(), getAiKey(), { firstParty: true });
    }
    await instrumentOperation("activation", doActivate)(context);
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

export function registerCommand(context: vscode.ExtensionContext, commandName: string, func: (...args: any[]) => any, withOperationIdAhead?: boolean): void {
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
    await mavenExplorerProvider.loadProjects();
    context.subscriptions.push(vscode.window.createTreeView("mavenProjects", { treeDataProvider: mavenExplorerProvider, showCollapseAll: true }));
    // pom.xml listener to refresh tree view
    registerPomFileWatcher(context);
    // register output, terminal, taskExecutor
    context.subscriptions.push(mavenOutputChannel, mavenTerminal, taskExecutor);
    // register common goals
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        registerCommand(context, `maven.goal.${goal}`, async (node: MavenProject) => executeInTerminal({ command: goal, pomfile: node.pomPath }));
    });
    registerCommand(context, "maven.explorer.refresh", refreshExplorerHandler);
    registerCommand(context, "maven.project.effectivePom", async (projectOrUri: Uri | MavenProject) => await Utils.showEffectivePom(projectOrUri));
    registerCommand(context, "maven.goal.custom", async (node: MavenProject) => await Utils.executeCustomGoal(node.pomPath));
    registerCommand(context, "maven.project.openPom", openPomHandler);
    registerCommand(context, "maven.archetype.generate", async (operationId: string, entry: Uri | undefined) => {
        await ArchetypeModule.generateFromArchetype(entry, operationId);
    }, true);
    registerCommand(context, "maven.archetype.update", updateArchetypeCatalogHandler);
    registerCommand(context, "maven.history", mavenHistoryHandler);
    registerCommand(context, "maven.favorites", runFavoriteCommandsHandler);
    registerCommand(context, "maven.goal.execute", async () => await Utils.executeMavenCommand());
    registerCommand(context, "maven.plugin.execute", async (pluginGoal: PluginGoal) => await executeInTerminal({ command: pluginGoal.name, pomfile: pluginGoal.plugin.project.pomPath }));
    registerCommand(context, "maven.view.flat", () => Settings.changeToFlatView());
    registerCommand(context, "maven.view.hierarchical", () => Settings.changeToHierarchicalView());

    registerConfigChangeListener(context);

    // Free resources when manually closing a terminal
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
            mavenTerminal.dispose(closedTerminal.name);
        })
    );

    // Reload projects when workspace folders added/removed
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async (e: vscode.WorkspaceFoldersChangeEvent) => {
            for (const removedWorkspaceFolder of e.removed) {
                await mavenExplorerProvider.removeWorkspaceFolder(removedWorkspaceFolder);
            }
            for (const addedWorkspaceFolder of e.added) {
                await mavenExplorerProvider.addWorkspaceFolder(addedWorkspaceFolder);
            }
        })
    );

    registerPomFileAuthoringHelpers(context);
    // dependency
    registerCommand(context, "maven.project.addDependency", addDependencyHandler);
    registerCommand(context, "maven.project.showDependencies", showDependenciesHandler);

    // debug
    registerCommand(context, "maven.plugin.debug", debugHandler);
    vscode.debug.onDidTerminateDebugSession((session: any) => {
        if (session.type === "java") {
            const terminalName: string = session._configuration.terminalName;
            if (terminalName) {
                // After terminating debug session, output is no longer visible.
                // Solution: via future API waitOnExit
                // See: https://github.com/Microsoft/vscode/issues/70444
                mavenTerminal.dispose(terminalName);
            }
        }
    });
    // register artifact searcher if Java language server is activated
    if (isJavaExtEnabled()) {
        registerArtifactSearcher(context);
    }
}

function registerPomFileWatcher(context: vscode.ExtensionContext): void {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(Settings.Pomfile.globPattern());
    watcher.onDidCreate((e: Uri) => mavenExplorerProvider.addProject(e.fsPath), null, context.subscriptions);
    watcher.onDidChange(async (e: Uri) => {
        const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(e.fsPath);
        if (project) {
            await project.refresh();
            if (Settings.Pomfile.autoUpdateEffectivePOM()) {
                taskExecutor.execute(async () => {
                    await project.refreshEffectivePom();
                    mavenExplorerProvider.refresh(project);
                });
            }
        }
    }, null, context.subscriptions);
    watcher.onDidDelete((e: Uri) => mavenExplorerProvider.removeProject(e.fsPath), null, context.subscriptions);
    context.subscriptions.push(watcher);
}

function registerConfigChangeListener(context: vscode.ExtensionContext): void {
    const configChangeListener: vscode.Disposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        // close all terminals with outdated JAVA related environment variables
        if (e.affectsConfiguration("maven.terminal.useJavaHome")
            || e.affectsConfiguration("maven.terminal.customEnv")
            || e.affectsConfiguration("java.home") && Settings.Terminal.useJavaHome()
        ) {
            mavenTerminal.dispose();
        }
        if (e.affectsConfiguration("maven.view")
            || e.affectsConfiguration("maven.pomfile.globPattern")) {
            mavenExplorerProvider.refresh();
        }
    });
    context.subscriptions.push(configChangeListener);
}

function registerPomFileAuthoringHelpers(context: vscode.ExtensionContext): void {
    const pomSelector: vscode.DocumentSelector = [{
        language: "xml",
        scheme: "file",
        pattern: Settings.Pomfile.globPattern()
    }];
    // completion item provider
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(pomSelector, completionProvider, ".", "-", "<"));
    registerCommand(context, "maven.completion.selected", sendInfo, true);
    // hover
    context.subscriptions.push(vscode.languages.registerHoverProvider(pomSelector, hoverProvider));
}

async function mavenHistoryHandler(item: MavenProject | undefined): Promise<void> {
    if (item) {
        await Utils.executeHistoricalGoals([item.pomPath]);
    } else {
        await Utils.executeHistoricalGoals(mavenExplorerProvider.mavenProjectNodes.map(node => node.pomPath));
    }
}

async function updateArchetypeCatalogHandler(): Promise<void> {
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, async (p: Progress<{}>) => {
        p.report({ message: "updating archetype catalog ..." });
        await ArchetypeModule.updateArchetypeCatalog();
        p.report({ message: "finished." });
    });
}

async function refreshExplorerHandler(item?: ITreeItem): Promise<void> {
    if (item && item.refresh) {
        await item.refresh();
    } else {
        mavenExplorerProvider.refresh(item);
    }
}

async function openPomHandler(node: MavenProject): Promise<void> {
    if (node !== undefined && node.pomPath) {
        await openFileIfExists(node.pomPath);
    }
}
