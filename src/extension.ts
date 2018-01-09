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
        TelemetryWrapper.setEnabled(() => vscode.workspace.getConfiguration("maven").get<boolean>("enableStatistics"));
        TelemetryWrapper.initilize(Utils.getExtensionPublisher(), Utils.getExtensionName(), Utils.getExtensionVersion(), Utils.getAiKey());
    }

    const mavenProjectsTreeDataProvider: ProjectDataProvider = new ProjectDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    ["clean", "validate", "compile", "test", "package", "verify", "install", "site", "deploy"].forEach((goal: string) => {
        TelemetryWrapper.registerCommand(context, `maven.goal.${goal}`, () => {
            return (item: ProjectItem): Promise<void> => mavenProjectsTreeDataProvider.executeGoal(item, goal);
        });
    });

    TelemetryWrapper.registerCommand(context, "maven.project.refreshAll", () => {
        return (): void => mavenProjectsTreeDataProvider.refreshTree();
    });

    TelemetryWrapper.registerCommand(context, "maven.project.effectivePom", () => {
        return (item: Uri | ProjectItem): Promise<void> => mavenProjectsTreeDataProvider.effectivePom(item);
    });

    TelemetryWrapper.registerCommand(context, "maven.goal.custom", () => {
        return (item: ProjectItem): Promise<void> => mavenProjectsTreeDataProvider.customGoal(item);
    });

    TelemetryWrapper.registerCommand(context, "maven.project.openPom", () => {
        return (item: ProjectItem): Promise<void> => item ? VSCodeUI.openFileIfExists(item.abosolutePath) : null;
    });

    TelemetryWrapper.registerCommand(context, "maven.archetype.generate", () => {
        return (entry: Uri | undefined): Promise<void> => ArchetypeModule.generateFromArchetype(entry);
    });

    TelemetryWrapper.registerCommand(context, "maven.archetype.update", () => {
        return (): Thenable<void> => vscode.window.withProgress({ location: vscode.ProgressLocation.Window }, async (p: Progress<{}>) => {
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
