// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

class CompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(_document: vscode.TextDocument, _position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        throw new Error("Method not implemented.");
    }
}

export const completionProvider: CompletionProvider = new CompletionProvider();
