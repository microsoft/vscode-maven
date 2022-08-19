// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Node } from "domhandler";
import * as vscode from "vscode";
import { getCurrentNode } from "../utils/lexerUtils";
import { ArtifactProvider } from "./providers/ArtifactProvider";
import { IXmlCompletionProvider } from "./providers/IXmlCompletionProvider";
import { PropertiesProvider } from "./providers/PropertiesProvider";
import { SchemaProvider } from "./providers/SchemaProvider";
import { SnippetProvider } from "./providers/SnippetProvider";

const XML_EXTENSION_ID = "redhat.vscode-xml";
export class PomCompletionProvider implements vscode.CompletionItemProvider {

    private providers: IXmlCompletionProvider[];

    constructor() {
        const providers = [
            new SnippetProvider(),
            new ArtifactProvider(),
            new PropertiesProvider(),
        ];

        const xmlExtension = vscode.extensions.getExtension(XML_EXTENSION_ID);
        if (!xmlExtension) {
            providers.push(new SchemaProvider());
        }

        this.providers = providers;

    }

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | undefined> {
        const documentText: string = document.getText();
        const cursorOffset: number = document.offsetAt(position);
        const currentNode: Node | undefined = getCurrentNode(documentText, cursorOffset);
        if (currentNode === undefined || currentNode.startIndex === null || currentNode.endIndex === null) {
            return undefined;
        }

        const ret = [];
        for (const provider of this.providers) {
            ret.push(...await provider.provide(document, position, currentNode));
        }
        return ret;
    }
}