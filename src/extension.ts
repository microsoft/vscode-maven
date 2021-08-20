// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation, sendInfo } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./archetype/ArchetypeModule";
import { codeActionProvider } from "./codeAction/codeActionProvider";
import { ConflictResolver, conflictResolver } from "./codeAction/conflictResolver";
import { completionProvider } from "./completion/completionProvider";
import { contentProvider } from "./contentProvider";
import { definitionProvider } from "./definition/definitionProvider";
import { diagnosticProvider } from "./DiagnosticProvider";
import { initExpService } from "./experimentationService";
import { decorationProvider } from "./explorer/decorationProvider";
import { mavenExplorerProvider } from "./explorer/mavenExplorerProvider";
import { Dependency } from "./explorer/model/Dependency";
import { ITreeItem } from "./explorer/model/ITreeItem";
import { MavenProject } from "./explorer/model/MavenProject";
import { PluginGoal } from "./explorer/model/PluginGoal";
import { pluginInfoProvider } from "./explorer/pluginInfoProvider";
import { addDependencyHandler } from "./handlers/addDependencyHandler";
import { debugHandler } from "./handlers/debugHandler";
import { excludeDependencyHandler } from "./handlers/excludeDependencyHandler";
import { goToEffectiveHandler } from "./handlers/goToEffectiveHandler";
import { jumpToDefinitionHandler } from "./handlers/jumpToDefinitionHandler";
import { runFavoriteCommandsHandler } from "./handlers/runFavoriteCommandsHandler";
import { setDependencyVersionHandler } from "./handlers/setDependencyVersionHandler";
import { showDependenciesHandler } from "./handlers/showDependenciesHandler";
import { hoverProvider } from "./hover/hoverProvider";
import { registerArtifactSearcher } from "./jdtls/artifactSearcher";
import { isJavaExtEnabled } from "./jdtls/commands";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { mavenTerminal } from "./mavenTerminal";
import { Settings } from "./Settings";
import { taskExecutor } from "./taskExecutor";
import { getAiKey, getExtensionId, getExtensionVersion, loadMavenSettingsFilePath, loadPackageInfo } from "./utils/contextUtils";
import { executeInTerminal } from "./utils/mavenUtils";
import { dependenciesContentUri, effectivePomContentUri, openFileIfExists, registerCommand, registerCommandRequiringTrust } from "./utils/uiUtils";
import { Utils } from "./utils/Utils";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await loadPackageInfo(context);
    // Usage data statistics.
    if (getAiKey()) {
        initialize(getExtensionId(), getExtensionVersion(), getAiKey(), { firstParty: true });
    }
    await initExpService(context);
    await instrumentOperation("activation", doActivate)(context);
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
}

async function doActivate(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    pluginInfoProvider.initialize(context);
    await vscode.commands.executeCommand("setContext", "vscode-maven:activated", true);
    // register tree view
    await mavenExplorerProvider.loadProjects();
    const view = vscode.window.createTreeView("mavenProjects", { treeDataProvider: mavenExplorerProvider, showCollapseAll: true });
    context.subscriptions.push(view);
    registerCommand(context, "maven.project.goToEffective", (node?: Dependency) => goToEffectiveHandler(view, node));
    context.subscriptions.push(vscode.workspace.onDidGrantWorkspaceTrust(_e => {
        mavenExplorerProvider.refresh();
    }));
    // pom.xml listener to refresh tree view
    registerPomFileWatcher(context);
    // register output, terminal, taskExecutor
    context.subscriptions.push(mavenOutputChannel, mavenTerminal, taskExecutor);
    // register common goals
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        registerCommandRequiringTrust(context, `maven.goal.${goal}`, async (node: MavenProject) => executeInTerminal({ command: goal, pomfile: node.pomPath }));
    });
    registerCommand(context, "maven.explorer.refresh", refreshExplorerHandler);
    registerCommandRequiringTrust(context, "maven.project.effectivePom", async (projectOrUri: Uri | MavenProject) => await Utils.showEffectivePom(projectOrUri));
    registerCommandRequiringTrust(context, "maven.goal.custom", async (node: MavenProject) => await Utils.executeCustomGoal(node.pomPath));
    registerCommand(context, "maven.project.openPom", openPomHandler);
    // create project from archetype
    registerCommand(context, "maven.archetype.generate", async (operationId: string, entry: Uri | undefined) => {
        await ArchetypeModule.createMavenProject(entry, operationId);
    }, true);
    registerCommand(context, "maven.archetype.update", updateArchetypeCatalogHandler);
    registerProjectCreationEndListener(context);

    registerCommandRequiringTrust(context, "maven.history", mavenHistoryHandler);
    registerCommandRequiringTrust(context, "maven.favorites", runFavoriteCommandsHandler);
    registerCommandRequiringTrust(context, "maven.goal.execute", Utils.executeMavenCommand);
    registerCommandRequiringTrust(context, "maven.goal.execute.fromProjectManager", Utils.executeMavenCommand);
    registerCommandRequiringTrust(context, "maven.goal.execute.fromLifecycleMenu", Utils.executeMavenCommand);
    registerCommandRequiringTrust(context, "maven.plugin.execute", async (pluginGoal: PluginGoal) => await executeInTerminal({ command: pluginGoal.name, pomfile: pluginGoal.plugin.project.pomPath }));
    registerCommand(context, "maven.view.flat", () => Settings.changeToFlatView());
    registerCommand(context, "maven.view.hierarchical", () => Settings.changeToHierarchicalView());

    registerConfigChangeListener(context);

    // Free resources when a terminal is manually closed
    context.subscriptions.push(
        vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
            const name: string | undefined = mavenTerminal.find(closedTerminal);
            if (name !== undefined) {
                mavenTerminal.dispose(name);
            }
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
    registerCommand(context, "maven.project.excludeDependency", excludeDependencyHandler);
    registerCommand(context, "maven.project.setDependencyVersion", setDependencyVersionHandler);
    registerCommand(context, "maven.project.goToDefinition", jumpToDefinitionHandler);

    // debug
    registerCommand(context, "maven.plugin.debug", debugHandler);
    vscode.debug.onDidTerminateDebugSession((session) => {
        if (session.type === "java") {
            const terminalName: string = session.configuration.terminalName;
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

    //diagnostic
    diagnosticProvider.initialize(context);
    //fileDecoration
    context.subscriptions.push(decorationProvider);
    //textDocument based output (e.g. effective-pom, dependencies)
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider("vscode-maven", contentProvider));
}

function registerPomFileWatcher(context: vscode.ExtensionContext): void {
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher(Settings.Pomfile.globPattern());
    watcher.onDidCreate((e: Uri) => mavenExplorerProvider.addProject(e.fsPath), null, context.subscriptions);
    watcher.onDidChange(async (e: Uri) => {
        const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(e.fsPath);
        if (project) {
            // notify dependencies/effectivePOM to update
            contentProvider.invalidate(effectivePomContentUri(project.pomPath));
            contentProvider.invalidate(dependenciesContentUri(project.pomPath));

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
    const configChangeListener: vscode.Disposable = vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
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
        if (e.affectsConfiguration("maven.executable.preferMavenWrapper")) {
            context.workspaceState.update("trustMavenWrapper", undefined);
        }
        // refresh MAVEN_LOCAL_REPOSITORY when change to a new settingsFile
        if (e.affectsConfiguration("maven.settingsFile")) {
            await loadMavenSettingsFilePath();
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
    // navigate to dependency pom
    context.subscriptions.push(vscode.languages.registerDefinitionProvider([...pomSelector, {
        pattern: "**/*.pom"
    }], definitionProvider));
    // add a dependency
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(pomSelector, codeActionProvider));
    // add quick fix for conflict dependencies
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(pomSelector, conflictResolver, {providedCodeActionKinds: ConflictResolver.providedCodeActionKinds}));
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

async function openPomHandler(node: MavenProject | { uri: string }): Promise<void> {
    if (node instanceof MavenProject) {
        if (node.pomPath) {
            await openFileIfExists(node.pomPath);
        }
    } else {
        // for nodes from Project Manager
        if (node.uri) {
            const pomPath: string = path.join(Uri.parse(node.uri).fsPath, "pom.xml");
            await openFileIfExists(pomPath);
        }
    }
}

function registerProjectCreationEndListener(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (e.execution.task.name === "createProject" && e.execution.task.source === "maven") {
            if (e.exitCode !== 0) {
                vscode.window.showErrorMessage("Failed to create the project, check terminal output for more details.");
                return;
            }

            const { targetFolder, artifactId } = e.execution.task.definition;
            const projectFolder = path.join(targetFolder, artifactId);
            // Open project either is the same workspace or new workspace
            const hasOpenFolder = vscode.workspace.workspaceFolders !== undefined;
            const OPEN_IN_NEW_WORKSPACE = "Open";
            const OPEN_IN_CURRENT_WORKSPACE = "Add to Workspace";
            const candidates: string[] = <string[]>[
                OPEN_IN_NEW_WORKSPACE,
                hasOpenFolder ? OPEN_IN_CURRENT_WORKSPACE : undefined
            ].filter(Boolean);

            const choice = await vscode.window.showInformationMessage(`Maven project [${artifactId}] is created under: ${targetFolder}`, ...candidates);

            if (choice === OPEN_IN_NEW_WORKSPACE) {
                vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectFolder), hasOpenFolder);
            } else if (choice === OPEN_IN_CURRENT_WORKSPACE) {
                assert(vscode.workspace.workspaceFolders !== undefined);
                if (!vscode.workspace.workspaceFolders?.find((workspaceFolder) => projectFolder.startsWith(workspaceFolder.uri?.fsPath))) {
                    vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, null, { uri: vscode.Uri.file(projectFolder) });
                }
            }
        }
    }));
}
