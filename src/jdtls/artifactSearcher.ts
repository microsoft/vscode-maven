// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as path from "path";
import * as vscode from "vscode";
import { applyWorkspaceEdit } from "../utils/editUtils";
import { registerCommand } from "../utils/uiUtils";
import { executeJavaLanguageServerCommand, getJavaExtension, isJavaExtActivated } from "./commands";

// Please refer to https://help.eclipse.org/2019-06/index.jsp?topic=%2Forg.eclipse.jdt.doc.isv%2Freference%2Fapi%2Fconstant-values.html
const UNDEFINED_TYPE: string = "16777218"; // e.g. Unknown var;
const UNDEFINED_NAME: string = "570425394"; // e.g. Unknown.foo();

const COMMAND_SEARCH_ARTIFACT: string = "maven.artifactSearch";
const TITLE_RESOLVE_UNKNOWN_TYPE: string = "Resolve unknown type";

export function registerArtifactSearcher(context: vscode.ExtensionContext): void {
    const javaExt: vscode.Extension<any> | undefined = getJavaExtension();
    if (!!javaExt) {
        const resolver: TypeResolver = new TypeResolver(path.join(context.extensionPath, "resources", "IndexData"));

        registerCommand(context, COMMAND_SEARCH_ARTIFACT, async (param: any) => await resolver.pickAndAddDependency(param));

        context.subscriptions.push(vscode.languages.registerHoverProvider("java", {
            provideHover(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
                return resolver.getArtifactsHover(document, position);
            }
        }));

        context.subscriptions.push(vscode.languages.registerCodeActionsProvider("java", {
            provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, codeActionContext: vscode.CodeActionContext, _token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
                return resolver.getArtifactsCodeActions(document, codeActionContext, range);
            }
        }));
    }
}

class TypeResolver {
    private dataPath: string;
    private initialized: boolean = false;

    constructor(dataPath: string) {
        this.dataPath = dataPath;
    }

    public async initialize(): Promise<void> {
        if (!this.initialized) {
            try {
                await executeJavaLanguageServerCommand("java.maven.initializeSearcher", this.dataPath);
                this.initialized = true;
            } catch (error) {
                // ignore
            }
        }
    }

    public getArtifactsHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        if (!isJavaExtActivated()) {
            return undefined;
        }

        if (!this.initialized) {
            this.initialize().catch();
            return undefined;
        }

        const diagnostics: vscode.Diagnostic[] = vscode.languages.getDiagnostics(document.uri).filter(diagnostic => {
            return diagnosticIndicatesUnresolvedType(diagnostic, document)
                && position.isAfterOrEqual(diagnostic.range.start)
                && position.isBeforeOrEqual(diagnostic.range.end);
        });
        if (diagnostics.length > 0) {
            const diagnostic: vscode.Diagnostic = diagnostics[0];
            const line: number = diagnostic.range.start.line;
            const character: number = diagnostic.range.start.character;
            const className: string = document.getText(diagnostic.range);
            const length: number = document.offsetAt(diagnostic.range.end) - document.offsetAt(diagnostic.range.start);
            const param: any = {
                className,
                uri: encodeBase64(document.uri.toString()),
                line,
                character,
                length
            };
            const commandName: string = TITLE_RESOLVE_UNKNOWN_TYPE;
            const message: string = `\uD83D\uDC49 [${commandName}](command:${COMMAND_SEARCH_ARTIFACT}?${encodeURIComponent(JSON.stringify(param))} "${commandName}")`;
            const hoverMessage: vscode.MarkdownString = new vscode.MarkdownString(message);
            hoverMessage.isTrusted = true;
            return new vscode.Hover(hoverMessage);
        } else {
            return undefined;
        }
    }

    public getArtifactsCodeActions(document: vscode.TextDocument, context: vscode.CodeActionContext, _selectRange: vscode.Range): vscode.CodeAction[] | undefined {
        if (!isJavaExtActivated()) {
            return undefined;
        }

        if (!this.initialized) {
            this.initialize().catch();
            return undefined;
        }

        const diagnostics: vscode.Diagnostic[] = context.diagnostics.filter(diagnostic => {
            return diagnosticIndicatesUnresolvedType(diagnostic, document);
        });
        if (diagnostics.length > 0) {
            const range: vscode.Range = diagnostics[0].range;
            const className: string = document.getText(range);
            const uri: string = document.uri.toString();
            const line: number = range.start.line;
            const character: number = range.start.character;
            const length: number = document.offsetAt(range.end) - document.offsetAt(range.start);
            const command: vscode.Command = {
                title: TITLE_RESOLVE_UNKNOWN_TYPE,
                command: COMMAND_SEARCH_ARTIFACT,
                arguments: [{
                    className,
                    uri: encodeBase64(uri),
                    line,
                    character,
                    length
                }]
            };
            const codeAction: vscode.CodeAction = {
                title: `${TITLE_RESOLVE_UNKNOWN_TYPE} '${className}'`,
                command: command,
                kind: vscode.CodeActionKind.QuickFix
            };
            return [codeAction];
        } else {
            return [];
        }
    }

    public async pickAndAddDependency(param: any): Promise<void> {
        if (!isJavaExtActivated()) {
            return;
        }

        if (!this.initialized) {
            this.initialize().catch();
            return;
        }

        const pickItem: vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(getArtifactsPickItems(param.className), { placeHolder: "Select the artifact you want to add" });
        if (pickItem === undefined) {
            return;
        }
        param.uri = decodeBase64(param.uri);
        const edits: vscode.WorkspaceEdit[] = await getWorkSpaceEdits(pickItem, param);
        await applyEdits(vscode.Uri.parse(param.uri), edits);
    }
}

async function getArtifactsPickItems(className: string): Promise<vscode.QuickPickItem[]> {
    const searchParam: ISearchArtifactParam = {
        searchType: SearchType.className,
        className: className
    };
    const response: IArtifactSearchResult[] = await executeJavaLanguageServerCommand("java.maven.searchArtifact", searchParam);
    const picks: vscode.QuickPickItem[] = [];
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

async function applyEdits(uri: vscode.Uri, edits: any): Promise<void> {
    // if the pom is invalid, no change occurs in edits[2]
    if (Object.keys(edits[2].changes).length > 0) {
        // 0: import 1: replace
        await applyWorkspaceEdit(edits[0]);
        await applyWorkspaceEdit(edits[1]);
        let document: vscode.TextDocument = await vscode.workspace.openTextDocument(uri);
        document.save();

        // 2: pom
        if (edits[2].changes[Object.keys(edits[2].changes)[0]].length === 0) {
            // already has this dependency
            return;
        }
        await applyWorkspaceEdit(edits[2]);
        document = await vscode.workspace.openTextDocument(vscode.Uri.parse(Object.keys(edits[2].changes)[0]));
        document.save();
        const LINE_OFFSET: number = 1;
        // tslint:disable-next-line: restrict-plus-operands
        const startLine: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].range.start.line + LINE_OFFSET; // skip blank line
        const lineNumber: number = edits[2].changes[Object.keys(edits[2].changes)[0]][0].newText.indexOf("<dependencies>") === -1 ? 5 : 7;
        const editor: vscode.TextEditor = await vscode.window.showTextDocument(document, { selection: new vscode.Range(startLine, 0, startLine + lineNumber, 0), preview: false });
        editor.revealRange(new vscode.Range(startLine, 0, startLine + lineNumber, 0), vscode.TextEditorRevealType.InCenter);
    } else {
        vscode.window.showInformationMessage("Sorry, the pom.xml file is inexistent or invalid.");
    }
}

async function getWorkSpaceEdits(pickItem: vscode.QuickPickItem, param: any): Promise<vscode.WorkspaceEdit[]> {
    return await executeJavaLanguageServerCommand("java.maven.addDependency", pickItem.description, pickItem.detail, param.uri, param.line, param.character, param.length);
}

function startsWithCapitalLetter(word: string): boolean {
    return word.charCodeAt(0) >= 65 && word.charCodeAt(0) <= 90;
}

function diagnosticIndicatesUnresolvedType(diagnostic: vscode.Diagnostic, document: vscode.TextDocument): boolean {
    return (
        UNDEFINED_TYPE === diagnostic.code ||
        UNDEFINED_NAME === diagnostic.code && startsWithCapitalLetter(document.getText(diagnostic.range))
    );
}

function encodeBase64(content: string): string {
    return Buffer.from(content, "utf8").toString("base64");
}

function decodeBase64(content: string): string {
    return Buffer.from(content, "base64").toString("utf8");
}

export interface IArtifactSearchResult {
    groupId: string;
    artifactId: string;
    version: string;
    className: string;
    fullClassName: string;
    usage: number;
    kind: number;
}

export enum SearchType {
    className = "CLASSNAME",
    identifier = "IDENTIFIER"
}

export interface ISearchArtifactParam {
    searchType: SearchType;
    className?: string;
    groupId?: string;
    artifactId?: string;
}
