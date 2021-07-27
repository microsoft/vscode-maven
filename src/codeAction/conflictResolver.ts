// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { diagnosticProvider, MAVEN_DEPENDENCY_CONFLICT } from "../DiagnosticProvider";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { Dependency } from "../explorer/model/Dependency";

export class ConflictResolver implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds: vscode.CodeActionKind[] = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.code === MAVEN_DEPENDENCY_CONFLICT)
            .map(diagnostic => this.createCommandCodeAction(diagnostic, document));
    }

    private createCommandCodeAction(diagnostic: vscode.Diagnostic, document: vscode.TextDocument): vscode.CodeAction {
        const node: Dependency | undefined = diagnosticProvider.map.get(diagnostic);
        if (node === undefined) {
            throw new Error("Failed to find Dependency.");
        }
        const gid: string = node.groupId;
        const aid: string = node.artifactId;
        const effectiveVersion: string = node.omittedStatus.effectiveVersion;

        const actionSetVersion = new vscode.CodeAction(`Resolve conflict for ${gid}:${aid}`, vscode.CodeActionKind.QuickFix);
        actionSetVersion.command = {
            command: "maven.project.setDependencyVersion",
            title: "set version to",
            arguments: [{
                pomPath: document.uri.fsPath,
                effectiveVersion: effectiveVersion,
                groupId: gid,
                artifactId: aid,
                fullDependencyText: mavenExplorerProvider.getMavenProject(document.uri.fsPath)?.fullText
            }]
        };
        actionSetVersion.diagnostics = [diagnostic];
        actionSetVersion.isPreferred = true;
        return actionSetVersion;
    }
}

export const conflictResolver: ConflictResolver = new ConflictResolver();
