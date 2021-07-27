// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { Dependency } from "../explorer/model/Dependency";
import { MavenProject } from "../explorer/model/MavenProject";
import { constructDependenciesNode, constructDependencyManagementNode, constructDependencyNode, getIndentation } from "../utils/editUtils";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";
import { getVersions } from "../utils/requestUtils";

export async function setDependencyVersionHandler(selectedItem?: any): Promise<void> {
    let pomPath: string;
    let effectiveVersion: string;
    if (selectedItem && selectedItem.pomPath) { // codeAction
        pomPath = selectedItem.pomPath;
        effectiveVersion = selectedItem.effectiveVersion;
    } else if (selectedItem && selectedItem instanceof Dependency) {
        pomPath = selectedItem.projectPomPath;
        effectiveVersion = selectedItem.omittedStatus.effectiveVersion;
    } else {
        throw new UserError("No dependency node specified.");
    }

    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }

    const gid: string = selectedItem.groupId;
    const aid: string = selectedItem.artifactId;
    const versions: string[] = getAllVersionsInTree(pomPath, gid, aid);
    const OPTION_SEARCH_MAVEN_CENTRAL: string = "Search Maven Central Repository...";
    versions.push(OPTION_SEARCH_MAVEN_CENTRAL);

    let selectedVersion: string | undefined = await vscode.window.showQuickPick(
        versions.map(version => ({ value: version, label: version !== OPTION_SEARCH_MAVEN_CENTRAL ? `$(package) ${version}` : version, description: version === effectiveVersion ? "effective" : undefined})),
        { placeHolder: `Select a version for ${gid}:${aid}...`,
            ignoreFocusOut: true}
    ).then(version => version ? version.value : undefined);
    if (selectedVersion === undefined) {
        return;
    }
    if (selectedVersion === OPTION_SEARCH_MAVEN_CENTRAL) {
        const selectedVersionFromMavenCentral: string | undefined = await vscode.window.showQuickPick<vscode.QuickPickItem & { value: string }>(
            getVersions(gid, aid).then(artifacts => artifacts.map(artifact => ({value: artifact.v, label: `$(package) ${artifact.v}`, description: artifact.v === effectiveVersion ? "effective" : undefined }))),
            { placeHolder: `Select a version for ${gid}:${aid}...`,
                ignoreFocusOut: true }
        ).then(artifact => artifact ? artifact.value : undefined);
        if (selectedVersionFromMavenCentral === undefined) {
            return;
        }
        selectedVersion = selectedVersionFromMavenCentral;
    }
    if (selectedVersion !== effectiveVersion) {
        await setDependencyVersion(pomPath, gid, aid, selectedVersion);
    }
}

async function setDependencyVersion(pomPath: string, gid: string, aid: string, version: string): Promise<void> {
    const contentBuf: Buffer = await fse.readFile(pomPath);
    const projectNodes: ElementNode[] = getNodesByTag(contentBuf.toString(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: ElementNode = projectNodes[0];
    const dependenciesNode:  ElementNode | undefined = projectNode.children?.find(node => node.tag === XmlTagName.Dependencies);
    const dependencyManagementNode: ElementNode | undefined = projectNode.children?.find(node => node.tag === XmlTagName.DependencyManagement);
    // find ${gid:aid} dependency node in <dependencies> to delete
    const deleteNode: ElementNode | undefined = dependenciesNode?.children?.find(node =>
        node.children?.find(id => id.tag === XmlTagName.GroupId && id.text === gid) !== undefined &&
        node.children?.find(id => id.tag === XmlTagName.ArtifactId && id.text === aid) !== undefined
    );

    if (dependencyManagementNode !== undefined) {
        await insertDependencyManagement(pomPath, dependencyManagementNode, deleteNode, gid, aid, version);
    } else {
        await insertDependencyManagement(pomPath, projectNode, deleteNode, gid, aid, version);
    }
}

async function insertDependencyManagement(pomPath: string, targetNode: ElementNode, deleteNode: ElementNode | undefined, gid: string, aid: string, version: string): Promise<void> {
    if ( targetNode.contentStart === undefined || targetNode.contentEnd === undefined) {
        throw new UserError("Invalid target XML node to insert dependency management.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, targetNode.contentEnd);
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces ? " ".repeat(<number>options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";

    let insertPosition: vscode.Position | undefined;
    let targetText: string;
    let dependencyNodeInManagement: ElementNode | undefined;
    const dependenciesNode: ElementNode | undefined = targetNode?.children?.find(node => node.tag === XmlTagName.Dependencies);

    if (targetNode.tag === XmlTagName.DependencyManagement && dependenciesNode !== undefined) {
        if (dependenciesNode.contentStart === undefined || dependenciesNode.contentEnd === undefined) {
            throw new UserError("Invalid target XML node to insert dependency management.");
        }
        insertPosition = currentDocument.positionAt(dependenciesNode.contentStart);
        // find ${gid:aid} dependency node that already in dependency management to delete
        dependencyNodeInManagement = dependenciesNode.children?.find(node =>
            node.children?.find(id => id.tag === XmlTagName.GroupId && id.text === gid) &&
            node.children?.find(id => id.tag === XmlTagName.ArtifactId && id.text === aid)
        );
        targetText = constructDependencyNode(gid, aid, version, `${baseIndent}${indent}`, indent, eol);
    } else if (targetNode.tag === XmlTagName.DependencyManagement && dependenciesNode === undefined) {
        insertPosition = currentDocument.positionAt(targetNode.contentStart);
        targetText = constructDependenciesNode(gid, aid, version, baseIndent, indent, eol);
    } else if (targetNode.tag === XmlTagName.Project) {
        insertPosition = currentDocument.positionAt(targetNode.contentEnd);
        targetText = constructDependencyManagementNode(gid, aid, version, baseIndent, indent, eol);
    } else {
        return;
    }

    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    if (deleteNode) { // the version of ${gid:aid} dependency node already imported should be deleted
        const versionItem: ElementNode | undefined = deleteNode.children?.find(node => node.tag === XmlTagName.Version);
        if (versionItem) {
            if (versionItem.contentStart === undefined || versionItem.contentEnd === undefined) {
                throw new UserError("Invalid target XML node to delete.");
            }
            const versionString: string = "<version>";
            const start: number = versionItem.contentStart - versionString.length;
            const end: number = versionItem.contentEnd + versionString.length + 1;
            const range = new vscode.Range(currentDocument.positionAt(start), currentDocument.positionAt(end));
            edit.delete(currentDocument.uri, range);
        }
    }
    if (dependencyNodeInManagement) { // ${gid:aid} dependency node that already exists in <dependencyManagement> shoule be deleted
        if (dependencyNodeInManagement.contentStart === undefined || dependencyNodeInManagement.contentEnd === undefined) {
            throw new UserError("Invalid target XML node to delete.");
        }
        const dependencyString: string = "<dependency>";
        const start = dependencyNodeInManagement.contentStart - dependencyString.length;
        const end = dependencyNodeInManagement.contentEnd + dependencyString.length + 1;
        const range = new vscode.Range(currentDocument.positionAt(start), currentDocument.positionAt(end));
        edit.delete(currentDocument.uri, range);
    }

    edit.insert(currentDocument.uri, insertPosition, targetText);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
    textEditor.document.save();
}

function getAllVersionsInTree(pomPath: string, gid: string, aid: string): string[] {
    const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
    if (project === undefined) {
        throw new Error("Failed to get maven projects.");
    }
    const fullText: string = project.fullText;
    const re = new RegExp(`${gid}:${aid}:[\\w.-]+`, "gm");
    const artifacts: string[] | null = fullText.match(re);
    let versions: string[] = [];
    if (artifacts !== null) {
        artifacts.forEach(a => { versions.push(a.slice(gid.length + aid.length + 2)); });
    }

    function compare(v1: string, v2: string): number {
        const indexCut1: number = v1.indexOf("-"); // filter char
        const indexCut2: number = v2.indexOf("-");
        if (indexCut1 !== -1) {
            v1 = v1.substr(0, indexCut1);
        }
        if (indexCut2 !== -1) {
            v2 = v2.substr(0, indexCut2);
        }
        const numbers1: number[] = v1.split(".").map(Number);
        const numbers2: number[] = v2.split(".").map(Number);
        const minLen: number = numbers1.length < numbers2.length ? numbers1.length : numbers2.length;
        let i: number = 0;
        while (i < minLen) {
            if (numbers1[i] < numbers2[i]) {
                return 1;
            } else if (numbers1[i] > numbers2[i]) {
                return -1;
            } else {
                i += 1;
            }
        }
        return 0;
    }

    versions = Array.from(new Set(versions)).sort(compare);
    return versions;
}
