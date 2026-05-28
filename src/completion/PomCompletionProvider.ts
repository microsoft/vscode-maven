// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Node } from "domhandler";
import * as vscode from "vscode";
import { isXmlExtensionEnabled } from "../utils/extensionUtils";
import { getCurrentNode } from "../utils/lexerUtils";
import { ArtifactProvider } from "./providers/ArtifactProvider";
import { IXmlCompletionProvider } from "./providers/IXmlCompletionProvider";
import { PropertiesProvider } from "./providers/PropertiesProvider";
import { SchemaProvider } from "./providers/SchemaProvider";
import { SnippetProvider } from "./providers/SnippetProvider";
import { Settings } from "../Settings";

export class PomCompletionProvider implements vscode.CompletionItemProvider {

    private providers: IXmlCompletionProvider[];

    constructor() {
        const providers = [
            new SnippetProvider(),
            new PropertiesProvider(),
        ];

        if (Settings.isGAVCompletionEnabled()) {
            providers.push(new ArtifactProvider());
        }

        if (!isXmlExtensionEnabled()) {
            providers.push(new SchemaProvider());
        }

        this.providers = providers;

    }

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | undefined> {
        if (token.isCancellationRequested) {
            return undefined;
        }
        const documentText: string = document.getText();
        const cursorOffset: number = document.offsetAt(position);
        const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
        if (currentNode === undefined || currentNode.startIndex === null || currentNode.endIndex === null) {
            return undefined;
        }

        const results = await Promise.all(
            this.providers.map(provider =>
                provider.provide(document, position, currentNode, token).catch(err => {
                    console.error(err);
                    return [] as vscode.CompletionItem[];
                })
            )
        );
        if (token.isCancellationRequested) {
            return undefined;
        }
        return ([] as vscode.CompletionItem[]).concat(...results);
    }
}