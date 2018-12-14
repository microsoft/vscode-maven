// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation, TelemetryWrapper } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./archetype/ArchetypeModule";
import { OperationCanceledError } from "./Errors";
import { mavenExplorerProvider } from "./explorer/MavenExplorerProvider";
import { ITreeItem } from "./explorer/model/ITreeItem";
import { MavenProject } from "./explorer/model/MavenProject";
import { PluginGoal } from "./explorer/model/PluginGoal";
import { pluginInfoProvider } from "./explorer/pluginInfoProvider";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { mavenTerminal } from "./mavenTerminal";
import { Settings } from "./Settings";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    // Usage data statistics.
    if (Utils.getAiKey()) {
        TelemetryWrapper.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
        await initialize(Utils.getExtensionId(), Utils.getExtensionVersion(), Utils.getAiKey());
    }
    await instrumentOperation("activation", doActivate)(context);
}

export async function deactivate(): Promise<void> {
    await disposeTelemetryWrapper();
    await mavenOutputChannel.dispose();
}

function registerCommand(context: vscode.ExtensionContext, commandName: string, func: (...args: any[]) => any, withOperationIdAhead?: boolean): void {
    const callbackWithTroubleshooting: (...args: any[]) => any = instrumentOperation(commandName, async (_operationId: string, ...args: any[]) => {
        try {
            return withOperationIdAhead ? await func(_operationId, ...args) : await func(...args);
        } catch (error) {
            if (error instanceof OperationCanceledError) {
                // swallow
            } else {
                VSCodeUI.showTroubleshootingDialog(`Command "${commandName}" fails. ${error.message}`);
            }
            throw error;
        }
    });
    // tslint:disable-next-line:no-suspicious-comment
    // TODO: replace TelemetryWrapper.registerCommand with vscode.commands.registerCommand.
    context.subscriptions.push(TelemetryWrapper.registerCommand(commandName, callbackWithTroubleshooting));
}

async function doActivate(_operationId: string, context: vscode.ExtensionContext): Promise<void> {
    await vscode.commands.executeCommand("setContext", "mavenExtensionActivated", true);
    pluginInfoProvider.initialize(context);
    context.subscriptions.push(vscode.window.registerTreeDataProvider("mavenProjects", mavenExplorerProvider));

    // pom.xml listener to refresh tree view
    const watcher: vscode.FileSystemWatcher = vscode.workspace.createFileSystemWatcher("**/pom.xml");
    watcher.onDidCreate((e: Uri) => mavenExplorerProvider.addProject(e.fsPath));
    watcher.onDidChange((e: Uri) => mavenExplorerProvider.getMavenProject(e.fsPath).refresh());
    watcher.onDidDelete((e: Uri) => mavenExplorerProvider.removeProject(e.fsPath));
    context.subscriptions.push(watcher);

    // register commands.
    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        registerCommand(context, `maven.goal.${goal}`, async (node: MavenProject) => {
            Utils.executeInTerminal(goal, node.pomPath);
        });
    });
    registerCommand(context, "maven.explorer.refresh", async (item?: ITreeItem): Promise<void> => {
        if (item && item.refresh) {
            await item.refresh();
        } else {
            mavenExplorerProvider.refresh(item);
        }
    });

    registerCommand(context, "maven.project.effectivePom", async (node: Uri | MavenProject) => {
        if (node instanceof Uri && node.fsPath) {
            await Utils.showEffectivePom(node.fsPath);
        } else if (node instanceof MavenProject && node.pomPath) {
            await Utils.showEffectivePom(node.pomPath);
        }
    });

    registerCommand(context, "maven.goal.custom", async (node: MavenProject) => {
        if (node && node.pomPath) {
            await Utils.excuteCustomGoal(node.pomPath);
        }
    });

    registerCommand(context, "maven.project.openPom", async (node: MavenProject) => {
        if (node && node.pomPath) {
            await VSCodeUI.openFileIfExists(node.pomPath);
        }
    });

    registerCommand(context, "maven.archetype.generate", async (operationId: string, entry: Uri | undefined) => {
        await ArchetypeModule.generateFromArchetype(entry, operationId);
    }, true);

    registerCommand(context, "maven.archetype.update", async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: Progress<{}>) => {
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

    registerCommand(context, "maven.goal.execute", async () => {
        await Utils.executeMavenCommand();
    });

    registerCommand(context, "maven.plugin.execute", async (node: PluginGoal) => {
        if (node &&
            node.name &&
            node.plugin && node.plugin.project && node.plugin.project.pomPath) {
            Utils.executeInTerminal(node.name, node.plugin.project.pomPath);
        }
    });

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        mavenTerminal.onDidCloseTerminal(closedTerminal);
    }));

    // configuration change listener
    vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        // close all terminals with outdated JAVA related Envs
        if (e.affectsConfiguration("maven.terminal.useJavaHome") || e.affectsConfiguration("maven.terminal.customEnv")) {
            mavenTerminal.closeAllTerminals();
        } else {
            const useJavaHome: boolean = Settings.Terminal.useJavaHome();
            if (useJavaHome && e.affectsConfiguration("java.home")) {
                mavenTerminal.closeAllTerminals();
            }
        }
    });

    // workspace folder change listener
    vscode.workspace.onDidChangeWorkspaceFolders((_e: vscode.WorkspaceFoldersChangeEvent) => {
        mavenExplorerProvider.refresh();
    });
}
