// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { Dependency } from "./explorer/model/Dependency";
import { UserError } from "./utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "./utils/lexerUtils";

export const MAVEN_DEPENDENCY_CONFLICT = "Maven dependency conflict";

class DiagnosticProvider {
    private _collection: vscode.DiagnosticCollection;
    private _map: Map<vscode.Diagnostic, Dependency> = new Map();

    public initialize(context: vscode.ExtensionContext): void {
        const dependencyCollection = vscode.languages.createDiagnosticCollection("Dependency");
        this._collection = dependencyCollection;
        context.subscriptions.push(this._collection);
        context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(doc => dependencyCollection.delete(doc.uri)));
    }

    public get map(): Map<vscode.Diagnostic, Dependency> {
        return this._map;
    }

    public async refreshDiagnostics(uri: vscode.Uri, conflictNodes: Dependency[]): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        for (const node of conflictNodes) {
            const diagnostic = await this.createDiagnostics(node);
            diagnostics.push(diagnostic);
            this._map.set(diagnostic, node);
        }
        this._collection.set(uri, diagnostics);
        return diagnostics;
    }

    public async createDiagnostics(node: Dependency): Promise<vscode.Diagnostic> {
        const root: Dependency = <Dependency> node.root;
        const range: vscode.Range = await this.findConflictRange(root.projectPomPath, root.groupId, root.artifactId);
        const message: string = `Dependency conflict in ${root.artifactId}: ${node.groupId}:${node.artifactId}:${node.version} conflict with ${node.omittedStatus.effectiveVersion}`;
        const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = MAVEN_DEPENDENCY_CONFLICT;
        return diagnostic;
    }

    public async findConflictRange(filePath: string, gid: string, aid: string): Promise<vscode.Range> {
        const contentBuf: Buffer = await fse.readFile(filePath);
        const projectNodes: ElementNode[] = getNodesByTag(contentBuf.toString(), XmlTagName.Project);
        if (projectNodes === undefined || projectNodes.length !== 1) {
            throw new UserError("Only support POM file with single <project> node.");
        }

        const projectNode: ElementNode = projectNodes[0];
        const dependenciesNode: ElementNode | undefined = projectNode.children?.find(node => node.tag === XmlTagName.Dependencies);
        const dependencyNode =  dependenciesNode?.children?.find(node =>
            node.children?.find(id => id.tag === XmlTagName.GroupId && id.text === gid) !== undefined &&
            node.children?.find(id => id.tag === XmlTagName.ArtifactId && id.text === aid) !== undefined
        );
        if (dependencyNode === undefined) {
            throw new UserError("Failed to find dependency.");
        }

        const aidItem: ElementNode | undefined = dependencyNode.children?.find(node => node.tag === XmlTagName.ArtifactId);
        if (aidItem === undefined || aidItem.contentStart === undefined || aidItem.contentEnd === undefined) {
            throw new UserError("Failed to find dependency.");
        }
        const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(filePath);
        return new vscode.Range(currentDocument.positionAt(aidItem.contentStart), currentDocument.positionAt(aidItem.contentEnd));
    }
}

export const diagnosticProvider: DiagnosticProvider = new DiagnosticProvider();
