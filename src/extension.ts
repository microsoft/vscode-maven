"use strict";
import * as vscode from "vscode";
import { Progress, Uri } from "vscode";
import { ArchetypeModule } from "./ArchetypeModule";
import { ProjectItem } from "./model/ProjectItem";
import { ProjectDataProvider } from "./ProjectDataProvider";
import { UsageData } from "./UsageData";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    await Utils.loadPackageInfo(context);
    // Usage data statistics.
    if (Utils.getAiKey()) {
        UsageData.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
    }

    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        UsageData.registerCommand(context, `maven.goal.${goal}`, (item: ProjectItem) => {
            mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
    });

    UsageData.registerCommand(context, "maven.project.refreshAll", () => {
        mavenProjectsTreeDataProvider.refreshTree();
    });

    UsageData.registerCommand(context, "maven.project.effectivePom", (item: Uri | ProjectItem) => {
        mavenProjectsTreeDataProvider.effectivePom(item);
    });

    UsageData.registerCommand(context, "maven.goal.custom", (item: ProjectItem) => {
        mavenProjectsTreeDataProvider.customGoal(item);
    });

    UsageData.registerCommand(context, "maven.project.openPom", (item: ProjectItem) => {
        if (item) {
            VSCodeUI.openFileIfExists(item.abosolutePath);
        }
    });

    UsageData.registerCommand(context, "maven.archetype.generate", (entry: Uri | undefined) => {
        ArchetypeModule.generateFromArchetype(entry);
    });

    UsageData.registerCommand(context, "maven.archetype.update", () => {
        vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: Progress<{}>) => {
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
