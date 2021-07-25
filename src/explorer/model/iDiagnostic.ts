// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as fse from "fs-extra";
import * as vscode from "vscode";
import { UserError } from "../../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../../utils/lexerUtils";
import { Dependency } from "./Dependency";

class IDiagnostic {
    private _collection: vscode.DiagnosticCollection;
    public set collection(collection: vscode.DiagnosticCollection) {
        this._collection = collection;
    }

    public async refreshDiagnostics(uri: vscode.Uri, conflictNodes: Dependency[]): Promise<vscode.Diagnostic[]> {
        let diagnostics: vscode.Diagnostic[] = [];
        for (const node of conflictNodes) {
            diagnostics = diagnostics.concat(await this.createDiagnostics(node));
        }
        this._collection.set(uri, diagnostics);
        return diagnostics;
    }

    public async createDiagnostics(node: Dependency): Promise<vscode.Diagnostic[]> {
        const root: Dependency = <Dependency> node.root;
        const diagnostics: vscode.Diagnostic[] = [];
        const range: vscode.Range = await this.findConflictRange(root.projectPomPath, root.groupId, root.artifactId);
        // TODO: change message
        const message: string = `${root.artifactId} has conflict dependencies: ${node.groupId}:${node.artifactId} ${node.version} conflict with ${node.omittedStatus.effectiveVersion}`;
        const diagnostic: vscode.Diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.code = "Maven dependency conflict";
        diagnostics.push(diagnostic);
        return diagnostics;
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

export const iDiagnostic: IDiagnostic = new IDiagnostic();
