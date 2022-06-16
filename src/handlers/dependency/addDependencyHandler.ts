// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag } from "domhandler";
import * as fse from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { MavenProject } from "../../explorer/model/MavenProject";
import { constructDependenciesNode, constructDependencyNode, getIndentation } from "../../utils/editUtils";
import { UserError } from "../../utils/errorUtils";
import { getInnerEndIndex, getInnerStartIndex, getNodesByTag, XmlTagName } from "../../utils/lexerUtils";
import { getArtifacts, IArtifactMetadata } from "../../utils/requestUtils";
import { selectProjectIfNecessary } from "../../utils/uiUtils";

export async function addDependencyHandler(options?: any): Promise<void> {
    let pomPath: string;
    if (options && options.pomPath) {
        // for nodes from Maven explorer
        pomPath = options.pomPath;
    } else if (options && options.projectBasePath) {
        // for "Maven dependencies" nodes from Project Manager
        pomPath = path.join(options.projectBasePath, "pom.xml");
    } else if (options?.project?.pomPath) {
        // for "Dependencies" node from module in Maven explorer
        pomPath = options.project.pomPath;
    } else {
        // select a project(pomfile)
        const selectedProject: MavenProject | undefined = await selectProjectIfNecessary();
        if (!selectedProject) {
            return;
        }
        pomPath = selectedProject.pomPath;
    }

    if (!await fse.pathExists(pomPath)) {
        throw new UserError("Specified POM file does not exist on file system.");
    }

    // check if another extension has passed a dependency to add on its own
    if (options && options.groupId && options.artifactId && options.version) {
        await addDependency(pomPath, options.groupId, options.artifactId, options.version, options.packaging, options.classifier);
    }
    else {

        const keywordString: string | undefined = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: "Input keywords to search artifacts from Maven Central Repository.",
            placeHolder: "e.g. spring azure storage",
            validateInput: (text: string) => {
                if (text.trim().length < 3) {
                    return "Keywords are too short.";
                }
                return undefined;
            }
        });
        if (!keywordString) {
            return;
        }

        const selectedDoc: IArtifactMetadata | undefined = await vscode.window.showQuickPick<vscode.QuickPickItem & { value: IArtifactMetadata }>(
            getArtifacts(keywordString.trim().split(/[-,. :]/)).then(artifacts => artifacts.map(artifact => ({ value: artifact, label: `$(package) ${artifact.a}`, description: artifact.g }))),
            { placeHolder: "Select a dependency ..." }
        ).then(selected => selected ? selected.value : undefined);
        if (!selectedDoc) {
            return;
        }
        await addDependency(pomPath, selectedDoc.g, selectedDoc.a, selectedDoc.latestVersion, selectedDoc.p, undefined);
    }
}

async function addDependency(pomPath: string, gid: string, aid: string, version: string, dependencyType: string, classifier?: string): Promise<void> {
    // Find out <dependencies> node and insert content.
    const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(pomPath), { preserveFocus: true });
    const projectNodes: Element[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: Element = projectNodes[0];
    const dependenciesNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.Dependencies) as Element | undefined;
    if (dependenciesNode !== undefined) {
        await insertDependency(pomPath, dependenciesNode, gid, aid, version, dependencyType, classifier);
    } else {
        await insertDependency(pomPath, projectNode, gid, aid, version, dependencyType, classifier);

    }
}

async function insertDependency(pomPath: string, targetNode: Element, gid: string, aid: string, version: string, dependencyType: string, classifier?: string): Promise<void> {
    const currentDocument: vscode.TextDocument = await vscode.workspace.openTextDocument(pomPath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(currentDocument);
    const baseIndent: string = getIndentation(currentDocument, getInnerEndIndex(targetNode));
    const options: vscode.TextEditorOptions = textEditor.options;
    const indent: string = options.insertSpaces && typeof options.tabSize === "number" ? " ".repeat(options.tabSize) : "\t";
    const eol: string = currentDocument.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";
    let insertPosition: vscode.Position;
    let targetText: string;
    if (targetNode.tagName === XmlTagName.Dependencies) {
        insertPosition = currentDocument.positionAt(getInnerStartIndex(targetNode));
        targetText = constructDependencyNode({ gid, aid, version, dtype: dependencyType, classifier, baseIndent, indent, eol });
    } else if (targetNode.tagName === XmlTagName.Project) {
        insertPosition = currentDocument.positionAt(getInnerEndIndex(targetNode));
        targetText = constructDependenciesNode({ gid, aid, version, dtype: dependencyType, classifier, baseIndent, indent, eol });
    } else {
        return;
    }

    const edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
    edit.insert(currentDocument.uri, insertPosition, targetText);
    await vscode.workspace.applyEdit(edit);
    const endingPosition: vscode.Position = currentDocument.positionAt(currentDocument.offsetAt(insertPosition) + targetText.length);
    textEditor.revealRange(new vscode.Range(insertPosition, endingPosition));
}
