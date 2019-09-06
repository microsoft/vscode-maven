import { commands, Position, Range, Selection, TextEdit, TextEditor, Uri, window, workspace, WorkspaceEdit } from 'vscode';
import * as ls from "vscode-languageserver-protocol";

// tslint:disable-next-line: export-name
export async function applyWorkspaceEdit(edit: ls.WorkspaceEdit): Promise<void> {
    const workspaceEdit: WorkspaceEdit = asWorkspaceEdit(edit);
    if (workspaceEdit) {
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
            for (let i: number = 1; i < changes.length; i++) {
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
            // handleErrors(error);
        }
    }
}

async function executeRangeFormat(editor: TextEditor, startPosition: Position, lineOffset: number): Promise<void> {
    const endPosition: Position = editor.document.positionAt(editor.document.offsetAt(new Position(startPosition.line + lineOffset + 1, 0)) - 1);
    editor.selection = new Selection(startPosition, endPosition);
    await commands.executeCommand("editor.action.formatSelection");
}

function asPosition(value: undefined | null): undefined;
function asPosition(value: ls.Position): Position;
function asPosition(value: ls.Position | undefined | null): Position | undefined;
function asPosition(value: ls.Position | undefined | null): Position | undefined {
    if (!value) {
        return undefined;
    }
    return new Position(value.line, value.character);
}

function asRange(value: undefined | null): undefined;
function asRange(value: ls.Range): Range;
function asRange(value: ls.Range | undefined | null): Range | undefined;
function asRange(value: ls.Range | undefined | null): Range | undefined {
    if (!value) {
        return undefined;
    }
    return new Range(asPosition(value.start), asPosition(value.end));
}

function asTextEdit(edit: undefined | null): undefined;
function asTextEdit(edit: ls.TextEdit): TextEdit;
function asTextEdit(edit: ls.TextEdit | undefined | null): TextEdit | undefined {
    if (!edit) {
        return undefined;
    }
    return new TextEdit(asRange(edit.range), edit.newText);
}

function asTextEdits(items: ls.TextEdit[]): TextEdit[];
function asTextEdits(items: undefined | null): undefined;
function asTextEdits(items: ls.TextEdit[] | undefined | null): TextEdit[] | undefined;
function asTextEdits(items: ls.TextEdit[] | undefined | null): TextEdit[] | undefined {
    if (!items) {
        return undefined;
    }
    return items.map(asTextEdit);
}

function asWorkspaceEdit(item: ls.WorkspaceEdit): WorkspaceEdit;
function asWorkspaceEdit(item: undefined | null): undefined;
function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null): WorkspaceEdit | undefined;
function asWorkspaceEdit(item: ls.WorkspaceEdit | undefined | null): WorkspaceEdit | undefined {
    if (!item) {
        return undefined;
    }
    const result: WorkspaceEdit = new WorkspaceEdit();
    if (item.documentChanges) {
        item.documentChanges.forEach((change: ls.TextDocumentEdit | ls.CreateFile | ls.RenameFile | ls.DeleteFile) => {
            if (ls.CreateFile.is(change)) {
                result.createFile(Uri.parse(change.uri), change.options);
            } else if (ls.RenameFile.is(change)) {
                result.renameFile(Uri.parse(change.oldUri), Uri.parse(change.newUri), change.options);
            } else if (ls.DeleteFile.is(change)) {
                result.deleteFile(Uri.parse(change.uri), change.options);
            } else if (ls.TextDocumentEdit.is(change)) {
                result.set(Uri.parse(change.textDocument.uri), asTextEdits(change.edits));
            } else {
                // handleErrors(new Error(`Unknown workspace edit change received:\n${JSON.stringify(change, undefined, 4)}`));
            }
        });
    } else if (item.changes) {
        Object.keys(item.changes).forEach((key: string) => {
            result.set(Uri.parse(key), asTextEdits(item.changes![key]));
        });
    }
    return result;
}
