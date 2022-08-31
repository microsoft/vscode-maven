// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Node } from "domhandler";
import * as vscode from "vscode";
import { getNodePath } from "../../utils/lexerUtils";
import { getXsdElement, XSDElement } from "../../mavenXsd";
import { trimBrackets } from "../utils";
import { IXmlCompletionProvider } from "./IXmlCompletionProvider";

export class SchemaProvider implements IXmlCompletionProvider {
    async provide(document: vscode.TextDocument, position: vscode.Position, currentNode: Node): Promise<vscode.CompletionItem[]> {
        const documentText = document.getText();
        const cursorOffset = document.offsetAt(position);
        const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";

        const nodePath = getNodePath(currentNode);
        const elem = getXsdElement(nodePath);
        const defToCompletionItem = (e: XSDElement) => {
            const name = e.name;
            const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
            let insertText;
            if (e.isLeaf) {
                // <textNode>|</textNode>
                insertText = `<${name}>$1</${name}>$0`;
            } else {
                // <complexNode>
                //   |
                // </complexNode>
                insertText = [`<${name}>`, "\t$0", `</${name}>`].join(eol);
            }
            const snippetContent: string = trimBrackets(insertText, documentText, cursorOffset);
            item.insertText = new vscode.SnippetString(snippetContent);

            if (e.isDeprecated) {
                item.tags = [vscode.CompletionItemTag.Deprecated]
            }
            item.documentation = e.markdownString;

            // trigger completion again immediately for non-leaf node
            if (!e.isLeaf) {
                item.command = {
                    command: "editor.action.triggerSuggest",
                    title: "Trigger Suggest"
                };
            }
            return item;
        }

        const items = elem?.candidates.map(defToCompletionItem) ?? [];
        return items;
    }
}