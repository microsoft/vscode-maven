// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { performance } from "perf_hooks";
import * as vscode from "vscode";
import { getRequestDelay, lruCache, MovingAverage } from "./debouncing";
import { Dependency } from "./explorer/model/Dependency";
import { MavenProject } from "./explorer/model/MavenProject";
import { getDependencyNode } from "./handlers/dependency/utils";
import { MavenProjectManager } from "./project/MavenProjectManager";
import { Settings } from "./Settings";
import { UserError } from "./utils/errorUtils";

export const MAVEN_DEPENDENCY_CONFLICT = "Maven dependency conflict";

class DiagnosticProvider {
    private _collection: vscode.DiagnosticCollection;
    public map: Map<vscode.Diagnostic, Dependency> = new Map();

    public initialize(context: vscode.ExtensionContext): void {
        const dependencyCollection = vscode.languages.createDiagnosticCollection("Dependency");
        this._collection = dependencyCollection;
        context.subscriptions.push(this._collection);
        context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(
        async e => {
            if (e.document.fileName.endsWith("pom.xml")) {
                await this.debouncedRefresh(e.document.uri);
            }
        }));
    }

    private updateNodeForDocumentTimeout: NodeJS.Timer;
    private async debouncedRefresh(uri: vscode.Uri): Promise<void> {
        if (this.updateNodeForDocumentTimeout) {
            clearTimeout(this.updateNodeForDocumentTimeout);
        }
        const timeout: number = getRequestDelay(uri);
        this.updateNodeForDocumentTimeout = setTimeout(async () => {
            const startTime: number = performance.now();
            await this.refreshDiagnostics(uri);
            const executionTime: number = performance.now() - startTime;
            const movingAverage: MovingAverage = lruCache.get(uri) || new MovingAverage();
            movingAverage.update(executionTime);
            lruCache.set(uri, movingAverage);
        }, timeout);
    }

    public async refreshDiagnostics(uri: vscode.Uri): Promise<void> {
        const diagnostics: vscode.Diagnostic[] = [];
        if (Settings.enableConflictDiagnostics() === false) {
            this._collection.set(uri, diagnostics);
            return;
        }
        const project: MavenProject | undefined = MavenProjectManager.get(uri.fsPath);
        if (project === undefined) {
            throw new Error("Failed to get maven project.");
        }

        const conflictNodes: Dependency[] = project.conflictNodes;
        for (const node of conflictNodes) {
            const diagnostic = await this.createDiagnostics(node);
            diagnostics.push(diagnostic);
            this.map.set(diagnostic, node);
        }
        this._collection.set(uri, diagnostics);
    }

    public async createDiagnostics(node: Dependency): Promise<vscode.Diagnostic> {
        const root: Dependency = node.root;
        const range: vscode.Range = await this.findConflictRange(root.projectPomPath, root.groupId, root.artifactId);
        const message: string = `Dependency conflict in ${root.artifactId}: ${node.groupId}:${node.artifactId}:${node.version} conflict with ${node.omittedStatus?.effectiveVersion}`;
        const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = MAVEN_DEPENDENCY_CONFLICT;
        return diagnostic;
    }

    public async findConflictRange(pomPath: string, gid: string, aid: string): Promise<vscode.Range> {
        const dependencyNode = await getDependencyNode(pomPath, gid, aid);
        if (dependencyNode === undefined) {
            throw new UserError("Failed to find dependency.");
        }

        const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
        return new vscode.Range(
            currentDocument.positionAt(dependencyNode.startIndex!),
            currentDocument.positionAt(dependencyNode.endIndex!)
        );
    }
}

export const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
