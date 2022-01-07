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

export function constructDependencyNode(options: { gid: string, aid: string, version: string, dtype?: string, classifier?: string, baseIndent: string, indent: string, eol: string }): string {

    const { gid, aid, version, dtype, classifier, baseIndent, indent, eol } = options;

    // init the array with the required params
    const builder: string[] = [
        eol,
        "<dependency>",
        `${indent}<groupId>${gid}</groupId>`,
        `${indent}<artifactId>${aid}</artifactId>`,
        `${indent}<version>${version}</version>`
    ];

    // add the packaging type if present and not the default
    if (dtype !== undefined && dtype !== "jar")
        builder.push(`${indent}<type>${dtype}</type>`);

    // add the classifier if present
    if (classifier !== undefined)
        builder.push(`${indent}<type>${classifier}</type>`);

    // cap the end of the array with the closing tag
    builder.push(`</dependency>${eol}`);

    // join the array together with the newlines and indents
    return builder.join(`${eol}${baseIndent}${indent}`);
}

export function constructDependenciesNode(options: { gid: string, aid: string, version: string, dtype?: string, classifier?: string, baseIndent: string, indent: string, eol: string }): string {

    const { gid, aid, version, dtype, classifier, baseIndent, indent, eol } = options;

    // use the existing dependency method to build that section, just add an extra bump to the indent
    const dependencyNode = constructDependencyNode({ gid, aid, version, dtype, baseIndent: (baseIndent + indent), classifier, indent, eol });

    // wrap the dependency with the dependencies node
    return [
        eol,
        "<dependencies>",
        dependencyNode,
        `</dependencies>${eol}`
    ].join(`${eol}${baseIndent}${indent}`);
}

export function constructDependencyManagementNode(options: { gid: string, aid: string, version: string, dtype?: string, classifier?: string, baseIndent: string, indent: string, eol: string }): string {

    const { gid, aid, version, dtype, classifier, baseIndent, indent, eol } = options;

    // use the existing dependencies method to build that section, just add an extra bump to the indent
    const dependenciesNode = constructDependenciesNode({ gid, aid, version, dtype, baseIndent: (baseIndent + indent), classifier, indent, eol });

    // wrap the dependencies with the dependencyManagement node
    return [
        eol,
        "<dependencyManagement>",
        dependenciesNode,
        `</dependencyManagement>${eol}`
    ].join(`${eol}${baseIndent}${indent}`);
}
