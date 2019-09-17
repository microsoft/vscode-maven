// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, Command, Diagnostic, Hover, languages, MarkdownString, Position, ProviderResult, QuickPickItem, Range, Selection, TextDocument, TextEditor, TextEditorRevealType, Uri, window, workspace, WorkspaceEdit} from "vscode";
import * as vscode from "vscode";
import { registerCommand } from "./extension";
import { executeJavaLanguageServerCommand } from "./jdtls/commands";
import { applyWorkspaceEdit } from "./utils/editUtils";

// Please refer to https://help.eclipse.org/2019-06/index.jsp?topic=%2Forg.eclipse.jdt.doc.isv%2Freference%2Fapi%2Fconstant-values.html
const UNDEFINED_TYPE: string = "16777218";
const UNDIFINED_NAME: string = "570425394";
const unresolvedCode: string[] = [UNDEFINED_TYPE, UNDIFINED_NAME];

// tslint:disable-next-line: export-name
export function registerArtifactSearcher(javaExt: vscode.Extension<any>, context: vscode.ExtensionContext): void {
    javaExt.activate().then(async () => {
        registerCommand(context, "maven.artifactSearch", async (param: any) => {
            const pickItem: QuickPickItem|undefined = await window.showQuickPick(getArtifactsPickItems(param.className), {placeHolder: "Select the artifact you want to add"});
            if (pickItem === undefined) {
                return;
            }
            const edits: WorkspaceEdit[] = await getWorkSpaceEdits(pickItem, param);
            await applyEdits(Uri.parse(param.uri), edits);
        });
        languages.registerHoverProvider("java", {
            provideHover(document: TextDocument, position: Position, _token: CancellationToken): ProviderResult<Hover> {
                return getArtifactsHover(document, position);
            }
        });
        languages.registerCodeActionsProvider("java", {
            // tslint:disable-next-line: no-shadowed-variable
            provideCodeActions(document: TextDocument, range: Range | Selection, context: CodeActionContext, _token: CancellationToken): ProviderResult<(Command | CodeAction)[]> {
                return getArtifactsCodeActions(document, context, range);
            }
        });
        await executeJavaLanguageServerCommand("java.maven.initializeSearcher", path.join(context.extensionPath, "resources", "IndexData"));
    });
}

async function getArtifactsPickItems(className: string):  Promise<QuickPickItem[]> {
    const response: IArtifactSearchResult[] = await executeJavaLanguageServerCommand("java.maven.searchArtifact", className);
    const picks: QuickPickItem[] = [];
    for (let i: number = 0; i < Math.min(Math.round(response.length / 5), 5); i += 1) {
        const arr: string[] = [response[i].groupId, " : ", response[i].artifactId, " : ", response[i].version];
        picks.push(
            {
                label: `$(thumbsup)  ${response[i].className}`,
                description: response[i].fullClassName,
                detail: arr.join("")
            }
        );
    }
    for (let i: number = Math.min(Math.round(response.length / 5), 5); i < response.length; i += 1) {
        const arr: string[] = [response[i].groupId, " : ", response[i].artifactId, " : ", response[i].version];
        picks.push(
            {
                label: response[i].className,
                description: response[i].fullClassName,
                detail: arr.join("")
            }
        );
    }
    return picks;
}

async function getWorkSpaceEdits(pickItem: QuickPickItem, param: any): Promise<WorkspaceEdit[]> {
    return await executeJavaLanguageServerCommand("java.maven.addDependency", pickItem.description, pickItem.detail, param.uri, param.line, param.character, param.length);
}

async function applyEdits(uri: Uri, edits: any): Promise<void> {
    // if the pom is invalid, no change occurs in edits[2]
    if (Object.keys(edits[2].changes).length > 0) {
        // 0: import 1: replace
        await applyWorkspaceEdit(edits[0]);
        await applyWorkspaceEdit(edits[1]);
        let document: TextDocument = await workspace.openTextDocument(uri);
        document.save();

        // 2: pom
        if (edits[2].changes[Object.keys(edits[2].changes)[0]].length === 0) {
            // already has this dependency
            return;
        }
        await applyWorkspaceEdit(edits[2]);
        document = await workspace.openTextDocument(Uri.parse(Object.keys(edits[2].changes)[0]));
        document.save();
        const LINE_OFFSET: number = 1;
        // tslint:disable-next-line: restrict-plus-operands
        const startLine: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].range.start.line + LINE_OFFSET; // skip blank line
        const lineNumber: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].newText.indexOf("<dependencies>") === -1 ? 5 : 7;
        const editor: TextEditor = await window.showTextDocument(document, {selection: new Range(startLine, 0, startLine + lineNumber, 0), preview: false});
        editor.revealRange(new Range(startLine, 0, startLine + lineNumber, 0), TextEditorRevealType.InCenter);
    } else {
        window.showInformationMessage("Sorry, the pom.xml file is inexistent or invalid.");
    }
}

function getArtifactsHover(document: TextDocument, position: Position): Hover|undefined {
    const diagnostics: Diagnostic[] = languages.getDiagnostics(document.uri).filter(value => {
        return value.code === UNDEFINED_TYPE && position.isAfterOrEqual(value.range.start) && position.isBeforeOrEqual(value.range.end);
    });
    if (diagnostics.length !== 0) {
        const line: number = diagnostics[0].range.start.line;
        const character: number = diagnostics[0].range.start.character;
        const className: string = document.getText(diagnostics[0].range);
        const length: number = document.offsetAt(diagnostics[0].range.end) - document.offsetAt(diagnostics[0].range.start);
        const param: any = {
            className,
            uri: document.uri.toString(),
            line,
            character,
            length
        };
        const commandName: string = "Resolve unknown type";
        const command: string = "maven.artifactSearch";
        const message: string = `\uD83D\uDC49 [\`${commandName}\`](command:${command}?${encodeURIComponent(JSON.stringify(param))} "${commandName}")`;
        const hoverMessage: MarkdownString = new MarkdownString(message);
        hoverMessage.isTrusted = true;
        return new Hover(hoverMessage);
    } else {
        return undefined;
    }
}

function getArtifactsCodeActions(document: TextDocument, context: CodeActionContext, range: Range): CodeAction[] {
    const className: string = document.getText(range);
    const uri: string = document.uri.toString();
    const line: number = range.start.line;
    const character: number = range.start.character;
    const length: number = document.offsetAt(range.end) - document.offsetAt(range.start);
    const command: Command = {
        title: "Resolve unknown type",
        command: "maven.artifactSearch",
        arguments: [{
            className,
            uri,
            line,
            character,
            length
        }]
    };
    const codeAction: CodeAction = {
        title: "Resolve unknown type",
        command: command,
        kind: CodeActionKind.QuickFix
    };
    const code: Diagnostic[] = context.diagnostics.filter(value => {
        return unresolvedCode.indexOf(String(value.code)) !== -1;
    });
    if (code.length > 0) {
        return [codeAction];
    } else {
        return [];
    }
}

interface IArtifactSearchResult {
    groupId: string;
    artifactId: string;
    version: string;
    className: string;
    fullClassName: string;
    usage: number;
    kind: number;
}
