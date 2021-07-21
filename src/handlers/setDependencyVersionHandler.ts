// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { Dependency } from "../explorer/model/Dependency";
import { MavenProject } from "../explorer/model/MavenProject";
import { constructDependenciesNode, constructDependencyNode, getIndentation } from "../utils/editUtils";
import { UserError } from "../utils/errorUtils";
import { ElementNode, getNodesByTag, XmlTagName } from "../utils/lexerUtils";
import { getVersions } from "../utils/requestUtils";

const CONFLICT_INDICATOR: string = "omitted for conflict";

export async function setDependencyVersionHandler(selectedItem?: Dependency): Promise<void> {
    if (selectedItem === undefined) {
        throw new UserError("No dependency node specified.");
    }
    const pomPath: string = selectedItem.projectPomPath;
    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }

    let effectiveVersion: string;
    if (selectedItem.supplement.indexOf(CONFLICT_INDICATOR) !== -1) {
        const re = /\(omitted for conflict with ([\w.-]+)\)/gm;
        effectiveVersion = selectedItem.supplement.replace(re, "$1");
    } else {
        effectiveVersion = selectedItem.version;
    }

    const gid: string = selectedItem.groupId;
    const aid: string = selectedItem.artifactId;
    const versions: string[] = getAllVersionsInTree(pomPath, gid, aid);
    const searchCommand: string = "Search versions from Maven Central Repository...";
    versions.push(searchCommand);

    const selectedVersion: string | undefined = await vscode.window.showQuickPick(
        versions.map(version => ({ value: version, label: version !== searchCommand ? `$(package) ${version}` : version, description: version === effectiveVersion ? "effective" : ""})),
        { placeHolder: `Select a version for ${gid}:${aid}...`,
            ignoreFocusOut: true}
    ).then(version => version ? version.value : undefined);
    if (!selectedVersion) {
        return;
    }
    if (selectedVersion === searchCommand) {
        const selectedVersionFromOrigin: string | undefined = await vscode.window.showQuickPick<vscode.QuickPickItem & { value: string }>(
            getVersions(gid, aid).then(artifacts => artifacts.map(artifact => ({value: artifact.v, label: `$(package) ${artifact.v}`, description: artifact.v === effectiveVersion ? "effective" : "" }))),
            { placeHolder: `Select a version for ${gid}:${aid}...`,
                ignoreFocusOut: true }
        ).then(artifact => artifact ? artifact.value : undefined);
        if (!selectedVersionFromOrigin) {
            return;
        }
        if (selectedVersionFromOrigin !== effectiveVersion) {
            await setDependencyVersion(pomPath, gid, aid, selectedVersionFromOrigin);
        }
    } else {
        if (selectedVersion !== effectiveVersion) {
            await setDependencyVersion(pomPath, gid, aid, selectedVersion);
        }
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
        targetText = constructDepedencyManagementNode(gid, aid, version, baseIndent, indent, eol);
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
    vscode.workspace.saveAll();
}

function getAllVersionsInTree(pomPath: string, gid: string, aid: string): string[] {
    const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
    if (project === undefined) {
        throw new UserError("Failed to get maven projects.");
    }
    const fullText: string = project.fullText;
    const re = new RegExp(`${gid}:${aid}:[\\w.-]+`, "gm");
    const artifacts: string[] | null = fullText.match(re);
    let versions: string[] = [];
    if (artifacts !== null) {
        artifacts.forEach(a => { versions.push(a.slice(gid.length + aid.length + 2)); });
    }

    function compare(v1: string, v2: string): number {
        if (v1 < v2) {
            return 1;
        } else if (v1 > v2) {
            return -1;
        } else {
            return 0;
        }
    }

    versions = Array.from(new Set(versions.sort(compare)));
    return versions;
}

function constructDepedencyManagementNode(gid: string, aid: string, version: string, baseIndent: string, indent: string, eol: string): string {
    return [
        eol,
        "<dependencyManagement>",
        `${indent}<dependencies>`,
        `${indent}${indent}<dependency>`,
        `${indent}${indent}${indent}<groupId>${gid}</groupId>`,
        `${indent}${indent}${indent}<artifactId>${aid}</artifactId>`,
        `${indent}${indent}${indent}<version>${version}</version>`,
        `${indent}${indent}</dependency>`,
        `${indent}</dependencies>`,
        `</dependencyManagement>${eol}`
    ].join(`${eol}${baseIndent}${indent}`);
}
