
import * as vscode from "vscode";

class CompletionProvider implements vscode.CompletionItemProvider {
    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        throw new Error("Method not implemented.");
    }

    // public resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
    //     throw new Error("Method not implemented.");
    // }

}

export const completionProvider: CompletionProvider = new CompletionProvider();
