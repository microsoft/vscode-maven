// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Node } from "domhandler";
import * as vscode from "vscode";

export interface IPomCompletionProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, currentNode: Node ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined>;
}