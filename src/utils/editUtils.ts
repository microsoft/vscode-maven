import * as vscode from "vscode";
import { commands, Position, Selection, TextEdit, TextEditor, window, workspace, WorkspaceEdit } from "vscode";
import * as protocolConverter from "vscode-languageclient/lib/common/protocolConverter";
import * as ls from "vscode-languageserver-protocol";

const p2c: protocolConverter.Converter = protocolConverter.createConverter(undefined, undefined);

// tslint:disable-next-line: export-name
export async function applyWorkspaceEdit(edit: ls.WorkspaceEdit): Promise<void> {
    const workspaceEdit: WorkspaceEdit = p2c.asWorkspaceEdit(edit);
    if (workspaceEdit !== undefined) {
        await workspace.applyEdit(workspaceEdit);
        // By executing the range formatting command to correct the indention according to the VS Code editor settings.
        // More details, see: https://github.com/redhat-developer/vscode-java/issues/557
        try {
            const currentEditor: TextEditor | undefined = window.activeTextEditor;
            // If the Uri path of the edit change is not equal to that of the active editor, we will skip the range formatting
            if (!currentEditor || currentEditor.document.uri.fsPath !== workspaceEdit.entries()[0][0].fsPath) {
                return;
            }
            const cursorPostion: Position = currentEditor.selection.active;
            // Get the array of all the changes
            const changes: TextEdit[] = workspaceEdit.entries()[0][1];
            // Get the position information of the first change
            let startPosition: Position = new Position(changes[0].range.start.line, changes[0].range.start.character);
            let lineOffsets: number = changes[0].newText.split(/\r?\n/).length - 1;
            for (let i: number = 1; i < changes.length; i += 1) {
                // When it comes to a discontinuous range, execute the range formatting and record the new start position
                if (changes[i].range.start.line !== startPosition.line) {
                    await executeRangeFormat(currentEditor, startPosition, lineOffsets);
                    startPosition = new Position(changes[i].range.start.line, changes[i].range.start.character);
                    lineOffsets = 0;
                }
                lineOffsets += changes[i].newText.split(/\r?\n/).length - 1;
            }
            await executeRangeFormat(currentEditor, startPosition, lineOffsets);
            // Recover the cursor's original position
            currentEditor.selection = new Selection(cursorPostion, cursorPostion);
        } catch (error) {
            // to handle the error
        }
    }
}

async function executeRangeFormat(editor: TextEditor, startPosition: Position, lineOffset: number): Promise<void> {
    const endPosition: Position = editor.document.positionAt(editor.document.offsetAt(new Position(startPosition.line + lineOffset + 1, 0)) - 1);
    editor.selection = new Selection(startPosition, endPosition);
    await commands.executeCommand("editor.action.formatSelection");
}

export function getIndentation(document: vscode.TextDocument, offset: number): string {
    const closingTagPosition: vscode.Position = document.positionAt(offset);
    return document.getText(new vscode.Range(
        new vscode.Position(closingTagPosition.line, 0),
        closingTagPosition
    ));
}

export function constructDependencyNode(options: {gid: string, aid: string, version: string, dtype?: string, baseIndent: string, indent: string, eol: string}): string {
    let dependencyNode: string;
    const {gid, aid, version, dtype, baseIndent, indent, eol} = options;
    if (dtype === undefined || dtype === "jar") {
        dependencyNode = [
            eol,
            "<dependency>",
            `${indent}<groupId>${gid}</groupId>`,
            `${indent}<artifactId>${aid}</artifactId>`,
            `${indent}<version>${version}</version>`,
            `</dependency>${eol}`
        ].join(`${eol}${baseIndent}${indent}`);
    } else {
        dependencyNode = [
            eol,
            "<dependency>",
            `${indent}<groupId>${gid}</groupId>`,
            `${indent}<artifactId>${aid}</artifactId>`,
            `${indent}<version>${version}</version>`,
            `${indent}<type>${dtype}</type>`,
            `</dependency>${eol}`
        ].join(`${eol}${baseIndent}${indent}`);
    }
    return dependencyNode;
}

export function constructDependenciesNode(options: {gid: string, aid: string, version: string, dtype?: string, baseIndent: string, indent: string, eol: string}): string {
    let dependenciesNode: string;
    const {gid, aid, version, dtype, baseIndent, indent, eol} = options;
    if (dtype === undefined || dtype === "jar") {
        dependenciesNode = [
            eol,
            "<dependencies>",
            `${indent}<dependency>`,
            `${indent}${indent}<groupId>${gid}</groupId>`,
            `${indent}${indent}<artifactId>${aid}</artifactId>`,
            `${indent}${indent}<version>${version}</version>`,
            `${indent}</dependency>`,
            `</dependencies>${eol}`
        ].join(`${eol}${baseIndent}${indent}`);
    } else {
        dependenciesNode = [
            eol,
            "<dependencies>",
            `${indent}<dependency>`,
            `${indent}${indent}<groupId>${gid}</groupId>`,
            `${indent}${indent}<artifactId>${aid}</artifactId>`,
            `${indent}${indent}<version>${version}</version>`,
            `${indent}${indent}<type>${dtype}</type>`,
            `${indent}</dependency>`,
            `</dependencies>${eol}`
        ].join(`${eol}${baseIndent}${indent}`);
    }
    return dependenciesNode;
}

export function constructDependencyManagementNode(gid: string, aid: string, version: string, baseIndent: string, indent: string, eol: string): string {
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
