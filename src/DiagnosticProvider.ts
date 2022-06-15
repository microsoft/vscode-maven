// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Element, isTag, isText, Node } from "domhandler";
import * as _ from "lodash";
import { performance } from "perf_hooks";
import * as vscode from "vscode";
import { getRequestDelay, lruCache, MovingAverage } from "./debouncing";
import { mavenExplorerProvider } from "./explorer/mavenExplorerProvider";
import { Dependency } from "./explorer/model/Dependency";
import { MavenProject } from "./explorer/model/MavenProject";
import { Settings } from "./Settings";
import { UserError } from "./utils/errorUtils";
import { getNodesByTag, XmlTagName } from "./utils/lexerUtils";

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
        const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(uri.fsPath);
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

    public async findConflictRange(filePath: string, gid: string, aid: string): Promise<vscode.Range> {
        const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(filePath);
        if (project === undefined) {
            throw new Error("Failed to get maven project.");
        }

        const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(filePath), { preserveFocus: true });
        const projectNodes: Element[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
        if (projectNodes === undefined || projectNodes.length !== 1) {
            throw new UserError("Only support POM file with single <project> node.");
        }

        const projectNode: Element = projectNodes[0];
        const dependenciesNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.Dependencies) as Element | undefined;
        const dependencyNode = dependenciesNode?.children?.find(node =>
            isTag(node) &&
            node.tagName === XmlTagName.Dependency &&
            node.children?.find(id =>
                isTag(id) && id.tagName === XmlTagName.GroupId &&
                id.firstChild && isText(id.firstChild) && project.fillProperties(id.firstChild.data) === gid
            ) &&
            node.children?.find(id =>
                isTag(id) && id.tagName === XmlTagName.ArtifactId &&
                id.firstChild && isText(id.firstChild) && project.fillProperties(id.firstChild.data) === aid
            )
        ) as Element | undefined;
        if (dependencyNode === undefined) {
            throw new UserError("Failed to find dependency.");
        }

        const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(filePath);
        return new vscode.Range(
            currentDocument.positionAt(dependencyNode.startIndex!),
            currentDocument.positionAt(dependencyNode.endIndex!)
        );
    }
}

export const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
