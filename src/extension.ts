// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";
import * as path from "path";
import * as vscode from "vscode";
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, Command, Diagnostic, Hover, languages, MarkdownString, Position, Progress, ProviderResult,
    QuickPickItem, Range, Selection, TextDocument, TextEditor, TextEditorRevealType, Uri, window, workspace, WorkspaceEdit, extensions} from "vscode";
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
import { debugHandler } from "./handlers/debugHandler";
import { runFavoriteCommandsHandler } from "./handlers/runFavoriteCommandsHandler";
import { showDependenciesHandler } from "./handlers/showDependenciesHandler";
import { hoverProvider } from "./hover/hoverProvider";
import { executeJavaLanguageServerCommand } from "./jdtls/commands";
import { mavenOutputChannel } from "./mavenOutputChannel";
import { mavenTerminal } from "./mavenTerminal";
import { Settings } from "./Settings";
import { taskExecutor } from "./taskExecutor";
import { getAiKey, getExtensionId, getExtensionVersion, loadPackageInfo } from "./utils/contextUtils";
import { applyWorkspaceEdit } from "./utils/editUtils";
import { executeInTerminal } from "./utils/mavenUtils";
import { openFileIfExists, showTroubleshootingDialog } from "./utils/uiUtils";
import { Utils } from "./utils/Utils";
import { updateIndex } from "./updateIndex";

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

// tslint:disable-next-line: max-func-body-length
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
        registerCommand(context, `maven.goal.${goal}`, async (node: MavenProject) => executeInTerminal({ command: goal, pomfile: node.pomPath }));
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
    registerCommand(context, "maven.plugin.execute", async (pluginGoal: PluginGoal) => await executeInTerminal({ command: pluginGoal.name, pomfile: pluginGoal.plugin.project.pomPath }));
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
    const pomSelector: vscode.DocumentSelector = [{
        language: "xml",
        scheme: "file",
        pattern: Settings.Pomfile.globPattern()
    }];
    // completion item provider
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(pomSelector, completionProvider, ".", "-", "<"));
    registerCommand(context, "maven.completion.selected", sendInfo, true);
    // dependency
    registerCommand(context, "maven.project.addDependency", async () => await addDependencyHandler());
    registerCommand(context, "maven.project.showDependencies", async (project: MavenProject) => await showDependenciesHandler(project));
    // hover
    context.subscriptions.push(vscode.languages.registerHoverProvider(pomSelector, hoverProvider));
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
    const EXTENSION_ID: string = "redhat.java";
    const javaExt: vscode.Extension<any> | undefined = extensions.getExtension(EXTENSION_ID);
    if (!!javaExt) {
        javaExt.activate().then(async () => {
            registerCommand(context, "maven.updateIndex", async () => {
                await updateIndex(path.join(context.extensionPath, "resources"));
            });
            registerCommand(context, "maven.artifactSearch", async (param: any) => {
                const pickItem: QuickPickItem|undefined = await window.showQuickPick(getArtifactsPickItems(param.className), {placeHolder: "Select the artifact you want to add"});
                if (pickItem === undefined) {
                    return;
                }
                const edits: WorkspaceEdit[] = await getWorkSpaceEdits(pickItem, param);
                await applyEdits(Uri.parse(param.uri), edits);
            });
            languages.registerHoverProvider("java", {
                provideHover(document: TextDocument, position: Position, _token: CancellationToken): ProviderResult<Hover> {
                    return getArtifactsHover(document, position);
                }
            });
            languages.registerCodeActionsProvider("java", {
                provideCodeActions(document: TextDocument, range: Range | Selection, _context: CodeActionContext, _token: CancellationToken): ProviderResult<(Command | CodeAction)[]> {
                    return getArtifactsCodeActions(document, range);
                }
            });
            await executeJavaLanguageServerCommand("java.maven.hello", path.join(context.extensionPath, "resources", "IndexData"));
        });
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
                    await project.effectivePom.update();
                    mavenExplorerProvider.refresh(project);
                });
            }
        }
    }, null, context.subscriptions);
    watcher.onDidDelete((e: Uri) => mavenExplorerProvider.removeProject(e.fsPath), null, context.subscriptions);
    context.subscriptions.push(watcher);
}

function registerConfigChangeListner(context: vscode.ExtensionContext): void {
    const configChangeListener: vscode.Disposable = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        // close all terminals with outdated JAVA related environment variables
        if (e.affectsConfiguration("maven.terminal.useJavaHome")
            || e.affectsConfiguration("maven.terminal.customEnv")
            || e.affectsConfiguration("java.home") && Settings.Terminal.useJavaHome()
        ) {
            mavenTerminal.closeAllTerminals();
        }
        if (e.affectsConfiguration("maven.view")
            || e.affectsConfiguration("maven.pomfile.globPattern")) {
            mavenExplorerProvider.refresh();
        }
    });
    context.subscriptions.push(configChangeListener);
}

async function getArtifactsPickItems(className: string):  Promise<QuickPickItem[]> {
    const response: IArtifactSearchResult[] = await executeJavaLanguageServerCommand("java.maven.artifactSearch", className);
    const picks: QuickPickItem[] = [];
    for (let i: number = 0; i < Math.min(Math.round(response.length / 5), 5); i += 1) {
        const arr: string[] = [response[i].groupId, " : ", response[i].artifactId, " : ", response[i].version];
        picks.push(
            {
                label: `$(thumbsup)  ${response[i].className}`,
                description: response[i].fullClassName,
                detail: arr.join("")
            }
        );
    }
    for (let i: number = Math.min(Math.round(response.length / 5), 5); i < response.length; i += 1) {
        const arr: string[] = [response[i].groupId, " : ", response[i].artifactId, " : ", response[i].version];
        picks.push(
            {
                label: response[i].className,
                description: response[i].fullClassName,
                detail: arr.join("")
            }
        );
    }
    return picks;
}

async function getWorkSpaceEdits(pickItem: QuickPickItem, param: any): Promise<WorkspaceEdit[]> {
    return await executeJavaLanguageServerCommand("java.maven.addDependency", pickItem.description, pickItem.detail, param.uri, param.line, param.character, param.length);
}

async function applyEdits(uri: Uri, edits: any): Promise<void> {
    // if the pom is invalid, no change occurs in edits[2]
    if (edits[2].changes) {
        // 0: import 1: replace
        await applyWorkspaceEdit(edits[0]);
        await applyWorkspaceEdit(edits[1]);
        let document: TextDocument = await workspace.openTextDocument(uri);
        document.save();

        // 2: pom
        if (edits[2].changes[Object.keys(edits[2].changes)[0]].length === 0) {
            return;
        }
        await applyWorkspaceEdit(edits[2]);
        document = await workspace.openTextDocument(Uri.parse(Object.keys(edits[2].changes)[0]));
        document.save();
        const startLine: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].range.start.line + 1; // skip blank line
        const lineNumber: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].newText.indexOf("<dependencies>") === -1 ? 5 : 7;
        const editor: TextEditor = await window.showTextDocument(document, {selection: new Range(startLine, 0, startLine + lineNumber, 0), preview: false});
        editor.revealRange(new Range(startLine, 0, startLine + lineNumber, 0), TextEditorRevealType.InCenter);
    } else {
        window.showInformationMessage("Sorry, the pom.xml file is invalid.");
    }
}

function getArtifactsHover(document: TextDocument, position: Position): Hover {
    const code1: string = "16777218";
    const diagnostics: Diagnostic[] = languages.getDiagnostics(document.uri).filter(value => {
        return value.code === code1 && position.isAfterOrEqual(value.range.start) && position.isBeforeOrEqual(value.range.end);
    });
    if (diagnostics.length !== 0) {
        const line: number = diagnostics[0].range.start.line;
        const character: number = diagnostics[0].range.start.character;
        const className: string = document.getText(diagnostics[0].range);
        const length: number = document.offsetAt(diagnostics[0].range.end) - document.offsetAt(diagnostics[0].range.start);
        const param: any = {
            className,
            uri: document.uri.toString(),
            line,
            character,
            length
        };
        const commandName: string = "Resolve unknown type";
        const command: string = "maven.artifactSearch"; 
        const message: string = `\uD83D\uDC49 [\`${commandName}\`](command:${command}?${encodeURIComponent(JSON.stringify(param))} "${commandName}")`;
        const hoverMessage: MarkdownString = new MarkdownString(message);
        hoverMessage.isTrusted = true;
        return new Hover(hoverMessage);
    } else {
        return new Hover(" ");
    }
}

function getArtifactsCodeActions(document: TextDocument, range: Range): CodeAction[] {
    const className: string = document.getText(range);
    const uri: string = document.uri.toString();
    const line: number = range.start.line;
    const character: number = range.start.character;
    const length: number = document.offsetAt(range.end) - document.offsetAt(range.start);
    const command: Command = {
        title: "Resolve unknown type",
        command: "maven.artifactSearch",
        arguments: [{
            className,
            uri,
            line,
            character,
            length
        }]
    };
    const codeAction: CodeAction = {
        title: "Resolve unknown type",
        command: command,
        kind: CodeActionKind.QuickFix
    };
    return [codeAction];
}

interface IArtifactSearchResult {
    groupId: string;
    artifactId: string;
    version: string;
    className: string;
    fullClassName: string;
    usage: number;
    kind: number;
}
