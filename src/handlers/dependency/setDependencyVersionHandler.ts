// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, isText } from "domhandler";
import * as fse from "fs-extra";
import * as semver from "semver";
import * as vscode from "vscode";
import { Dependency } from "../../explorer/model/Dependency";
import { MavenProject } from "../../explorer/model/MavenProject";
import { MavenProjectManager } from "../../project/MavenProjectManager";
import { constructDependenciesNode, constructDependencyManagementNode, constructDependencyNode, getIndentation } from "../../utils/editUtils";
import { UserError } from "../../utils/errorUtils";
import { getInnerEndIndex, getInnerStartIndex, getNodesByTag, XmlTagName } from "../../utils/lexerUtils";
import { getVersions } from "../../utils/requestUtils";
import { getDependencyNodeFromDependenciesNode } from "./utils";

export async function setDependencyVersionHandler(selectedItem?: any): Promise<void> {
    let pomPath: string;
    let effectiveVersion: string;
    if (selectedItem && selectedItem.pomPath) { // codeAction
        pomPath = selectedItem.pomPath;
        effectiveVersion = selectedItem.effectiveVersion;
    } else if (selectedItem && selectedItem instanceof Dependency) {
        pomPath = selectedItem.projectPomPath;
        effectiveVersion = selectedItem.omittedStatus?.effectiveVersion ?? selectedItem.version;
    } else {
        throw new UserError("No dependency node specified.");
    }

    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }

    const gid: string = selectedItem.groupId;
    const aid: string = selectedItem.artifactId;
    const versions: string[] = getAllVersionsInTree(pomPath, gid, aid);
    const OPTION_SEARCH_MAVEN_CENTRAL = "Search Maven Central Repository...";
    versions.push(OPTION_SEARCH_MAVEN_CENTRAL);

    let selectedVersion: string | undefined = await vscode.window.showQuickPick(
        versions.map(version => ({ value: version, label: version !== OPTION_SEARCH_MAVEN_CENTRAL ? `$(package) ${version}` : version, description: version === effectiveVersion ? "effective" : undefined })),
        {
            placeHolder: `Select a version for ${gid}:${aid}...`,
            ignoreFocusOut: true
        }
    ).then(version => version ? version.value : undefined);
    if (selectedVersion === undefined) {
        return;
    }
    if (selectedVersion === OPTION_SEARCH_MAVEN_CENTRAL) {
        const selectedVersionFromMavenCentral: string | undefined = await vscode.window.showQuickPick<vscode.QuickPickItem & { value: string }>(
            getVersions(gid, aid).then(artifacts => artifacts.map(artifact => ({ value: artifact.v, label: `$(package) ${artifact.v}`, description: artifact.v === effectiveVersion ? "effective" : undefined }))),
            {
                placeHolder: `Select a version for ${gid}:${aid}...`,
                ignoreFocusOut: true
            }
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
    const project: MavenProject | undefined = MavenProjectManager.get(pomPath);
    if (project === undefined) {
        throw new Error("Failed to get maven project.");
    }

    const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(pomPath), { preserveFocus: true });
    const projectNodes: Element[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: Element = projectNodes[0];
    const dependenciesNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.Dependencies) as Element | undefined;
    const dependencyManagementNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.DependencyManagement) as Element | undefined;
    // find ${gid:aid} dependency node in <dependencies> to delete
    const deleteNode = getDependencyNodeFromDependenciesNode(dependenciesNode, gid, aid, project);
    if (dependencyManagementNode !== undefined) {
        await insertDependencyManagement(pomPath, dependencyManagementNode, deleteNode, gid, aid, version);
    } else {
        await insertDependencyManagement(pomPath, projectNode, deleteNode, gid, aid, version);
    }
}

async function insertDependencyManagement(pomPath: string, targetNode: Element, deleteNode: Element | undefined, gid: string, aid: string, version: string): Promise<void> {
    if (targetNode === undefined) {
        throw new UserError("Invalid target XML node to insert dependency management.");
    }
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, getInnerEndIndex(targetNode));
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces && typeof options.tabSize === "number" ? " ".repeat(options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";

    let insertPosition: vscode.Position | undefined;
    let targetText: string;
    let dependencyNodeInManagement: Element | undefined;

    if (targetNode.tagName === XmlTagName.DependencyManagement) {
        const dependenciesNode: Element | undefined = targetNode?.children?.find(node => isTag(node) && node.tagName === XmlTagName.Dependencies) as Element | undefined;
        if (dependenciesNode) {
            insertPosition = currentDocument.positionAt(getInnerStartIndex(dependenciesNode));
            // find ${gid:aid} dependency node that already in dependency management to delete
            dependencyNodeInManagement = dependenciesNode?.children?.find(node =>
                isTag(node) &&
                node.tagName === XmlTagName.Dependency &&
                node.children?.find(id =>
                    isTag(id) && id.tagName === XmlTagName.GroupId &&
                    id.firstChild && isText(id.firstChild) && id.firstChild.data === gid
                ) &&
                node.children?.find(id =>
                    isTag(id) && id.tagName === XmlTagName.ArtifactId &&
                    id.firstChild && isText(id.firstChild) && id.firstChild.data === aid
                )
            ) as Element | undefined;
            const newIndent = `${baseIndent}${indent}`;
            targetText = constructDependencyNode({ gid, aid, version, baseIndent: newIndent, indent, eol });
        } else {
            insertPosition = currentDocument.positionAt(getInnerStartIndex(targetNode));
            targetText = constructDependenciesNode({ gid, aid, version, baseIndent, indent, eol });
        }
    } else if (targetNode.tagName === XmlTagName.Project) {
        insertPosition = currentDocument.positionAt(getInnerEndIndex(targetNode));
        targetText = constructDependencyManagementNode({ gid, aid, version, baseIndent, indent, eol });
    } else {
        return;
    }

    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    if (deleteNode) { // the version of ${gid:aid} dependency node already imported should be deleted
        const versionNode: Element | undefined = deleteNode.children?.find(node => isTag(node) && node.tagName === XmlTagName.Version) as Element | undefined;
        if (versionNode && versionNode.startIndex !== null && versionNode.endIndex !== null) {
            const start: number = versionNode.startIndex;
            const end: number = versionNode.endIndex + 1;
            const range = new vscode.Range(currentDocument.positionAt(start), currentDocument.positionAt(end));
            edit.delete(currentDocument.uri, range);
        }
    }
    if (dependencyNodeInManagement && dependencyNodeInManagement.startIndex !== null && dependencyNodeInManagement.endIndex !== null) { // ${gid:aid} dependency node that already exists in <dependencyManagement> shoule be deleted
        const start: number = dependencyNodeInManagement.startIndex;
        const end: number = dependencyNodeInManagement.endIndex + 1;
        const range = new vscode.Range(currentDocument.positionAt(start), currentDocument.positionAt(end));
        edit.delete(currentDocument.uri, range);
    }

    edit.insert(currentDocument.uri, insertPosition, targetText);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
}

function getAllVersionsInTree(pomPath: string, gid: string, aid: string): string[] {
    const project: MavenProject | undefined = MavenProjectManager.get(pomPath);
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
        // correct versions that do not follow SemVer Policy
        const s1: semver.SemVer | null = semver.coerce(v1);
        const s2: semver.SemVer | null = semver.coerce(v2);
        const version1: semver.SemVer | string = s1 === null ? v1 : s1;
        const version2: semver.SemVer | string = s2 === null ? v2 : s2;
        return semver.rcompare(version1, version2, true);
    }

    versions = Array.from(new Set(versions)).sort(compare);
    return versions;
}
