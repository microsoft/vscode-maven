import assert = require("assert");
import path = require("path");
import * as vscode from "vscode";
import { sendInfo } from "vscode-extension-telemetry-wrapper";
import { isJavaLanguageServerStandard } from "../jdtls/commands";

// corresponding to setting values
const OPEN_IN_NEW_WORKSPACE = "Open";
const OPEN_IN_CURRENT_WORKSPACE = "Add as Workspace Folder";
const OPEN_INTERACTIVE = "Interactive";

export function registerProjectCreationEndListener(context: vscode.ExtensionContext): void {
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (e.execution.task.name === "createProject" && e.execution.task.source === "maven") {
            if (e.exitCode !== 0) {
                vscode.window.showErrorMessage("Failed to create the project, check terminal output for more details.");
                return;
            }
            const { targetFolder, artifactId } = e.execution.task.definition;
            const projectFolder = path.join(targetFolder, artifactId);
            importProjectOnDemand(projectFolder);
            await promptOnDidProjectCreated(artifactId, projectFolder);
        }
    }));
}

export async function promptOnDidProjectCreated(projectName: string, projectFolderPath: string) {
    // Open project either is the same workspace or new workspace
    const hasOpenFolder = vscode.workspace.workspaceFolders !== undefined;
    const choice = await specifyOpenMethod(hasOpenFolder, projectName, projectFolderPath);
    if (choice === OPEN_IN_NEW_WORKSPACE) {
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(projectFolderPath), hasOpenFolder);
    } else if (choice === OPEN_IN_CURRENT_WORKSPACE) {
        assert(vscode.workspace.workspaceFolders !== undefined);
        if (!vscode.workspace.workspaceFolders?.find((workspaceFolder) => projectFolderPath.startsWith(workspaceFolder.uri?.fsPath))) {
            vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, null, { uri: vscode.Uri.file(projectFolderPath) });
        }
    }
}

async function specifyOpenMethod(hasOpenFolder: boolean, projectName: string, projectLocation: string) {
    let openMethod = vscode.workspace.getConfiguration("maven").get<string>("projectOpenBehavior");
    sendInfo("", {
        name: "projectOpenBehavior(from setting)",
        value: openMethod ?? "undefined"
    }, {});
    if (openMethod === OPEN_INTERACTIVE) {
        let alreadyInCurrentWorkspace = false;
        if(vscode.workspace.workspaceFolders?.find(wf => projectLocation.startsWith(wf.uri.fsPath))) {
            alreadyInCurrentWorkspace = true;
        }
        const candidates: string[] = alreadyInCurrentWorkspace ? ["OK"] : [
            OPEN_IN_NEW_WORKSPACE,
            hasOpenFolder ? OPEN_IN_CURRENT_WORKSPACE : undefined
        ].filter(Boolean) as string[];
        openMethod = await vscode.window.showInformationMessage(`Maven project [${projectName}] is created under: ${projectLocation}`, ...candidates);
        sendInfo("", {
            name: "projectOpenBehavior(from choice)",
            value: openMethod ?? "cancelled"
        }, {});
    }
    return openMethod;
}

export async function importProjectOnDemand(projectFolder: string) {
    if (!isJavaLanguageServerStandard()) {
        return;
    }

    let projectInCurrentWorkspace = false;
    if(vscode.workspace.workspaceFolders?.find(wf => projectFolder.startsWith(wf.uri.fsPath))) {
        projectInCurrentWorkspace = true;
    }

    if (!projectInCurrentWorkspace) {
        return;
    }

    const projectImportStrategy = vscode.workspace.getConfiguration("java").get("import.projectSelection");
    if (projectImportStrategy === "automatic") {
        vscode.commands.executeCommand("java.project.import");
    } else if (projectImportStrategy === "manual") {
        vscode.commands.executeCommand<void>("java.project.changeImportedProjects",
            [vscode.Uri.file(path.join(projectFolder, "pom.xml")).toString()],
            [],
            []);
    }
}
