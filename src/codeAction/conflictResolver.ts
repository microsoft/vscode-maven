// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { MAVEN_DEPENDENCY_CONFLICT } from "../explorer/model/iDiagnostic";

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
        // handle diagnostic.message: get arguments gid, aid, version
        // message = `${root.artifactId} has conflict dependencies: ${node.groupId}:${node.artifactId}:${node.version} conflict with ${node.omittedStatus.effectiveVersion}`;
        const re = /([\w.-]+) has conflict dependencies: ([\w.-]+):([\w.-]+):([\w.-]+) conflict with ([\w.-]+)/gm;
        const message: string = diagnostic.message.replace(re, "$2,$3,$5");
        const [gid, aid, effectiveVersion] = message.split(",");

        const actionSetVersion = new vscode.CodeAction(`Set version for ${gid}:${aid}`, vscode.CodeActionKind.QuickFix);
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
