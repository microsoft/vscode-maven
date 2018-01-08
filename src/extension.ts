"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { TelemetryWrapper, Transaction } from "vscode-extension-telemetry-wrapper";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectItem } from "./model/ProjectItem";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    // Usage data statistics.
    if (Utils.getAiKey()) {
        TelemetryWrapper.setEnabled(vscode.workspace.getConfiguration("maven").get<boolean>("enableStatistics"));
        TelemetryWrapper.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
    }

    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        TelemetryWrapper.registerCommand(context, `maven.goal.${goal}`, async (_t: Transaction, item: ProjectItem) => {
            await mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
    });

    TelemetryWrapper.registerCommand(context, "maven.project.refreshAll", async (_t: Transaction) => {
        await mavenProjectsTreeDataProvider.refreshTree();
    });

    TelemetryWrapper.registerCommand(context, "maven.project.effectivePom", async (_t: Transaction, item: Uri | ProjectItem) => {
        await mavenProjectsTreeDataProvider.effectivePom(item);
    });

    TelemetryWrapper.registerCommand(context, "maven.goal.custom", async (_t: Transaction, item: ProjectItem) => {
        await mavenProjectsTreeDataProvider.customGoal(item);
    });

    TelemetryWrapper.registerCommand(context, "maven.project.openPom", async (_t: Transaction, item: ProjectItem) => {
        if (item) {
            await VSCodeUI.openFileIfExists(item.abosolutePath);
        }
    });

    TelemetryWrapper.registerCommand(context, "maven.archetype.generate", async (_t: Transaction, entry: Uri | undefined) => {
        await ArchetypeModule.generateFromArchetype(entry);
    });

    TelemetryWrapper.registerCommand(context, "maven.archetype.update", async (_t: Transaction) => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: Progress<{}>) => {
            p.report({ message: "updating archetype catalog ..." });
            await ArchetypeModule.updateArchetypeCatalog();
            p.report({ message: "finished." });
        });
    });

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        VSCodeUI.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate(): void {
    // this method is called when your extension is deactivated
}
