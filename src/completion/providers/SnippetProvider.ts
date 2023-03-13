// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Element, isTag, Node } from "domhandler";
import * as vscode from "vscode";
import { XmlTagName } from "../../utils/lexerUtils";
import { COMMAND_COMPLETION_ITEM_SELECTED } from "../constants";
import { trimBrackets } from "../utils";
import { IXmlCompletionProvider } from "./IXmlCompletionProvider";

const artifactSegments: string[] = [
    "\t<groupId>$1</groupId>",
    "\t<artifactId>$2</artifactId>",
];
const dependencySnippetString = (eol: string) => [
    "<dependency>",
    ...artifactSegments,
    "</dependency>"
].join(eol);

const pluginSnippetString = (eol: string) => [
    "<plugin>",
    ...artifactSegments,
    "</plugin>"
].join(eol);

export class SnippetProvider implements IXmlCompletionProvider {
    async provide(document: vscode.TextDocument, position: vscode.Position, currentNode: Node): Promise<vscode.CompletionItem[]> {
        let tagNode: Element | undefined;
        if (isTag(currentNode)) {
            tagNode = currentNode;
        } else if (currentNode.parent && isTag(currentNode.parent)) {
            tagNode = currentNode.parent;
        } else {
            // TODO: should we recursively traverse up to find nearest tag node?
            return [];
        }

        const documentText = document.getText();
        const cursorOffset = document.offsetAt(position);
        const eol = document.eol === vscode.EndOfLine.LF ? "\n" : "\r\n";

        const ret: vscode.CompletionItem[] = [];
        switch (tagNode.tagName) {
            case XmlTagName.Dependencies: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("dependency", vscode.CompletionItemKind.Snippet);
                const snippetContent: string = trimBrackets(dependencySnippetString(eol), documentText, cursorOffset);
                const dependencySnippet: vscode.SnippetString = new vscode.SnippetString(snippetContent);
                snippetItem.insertText = dependencySnippet;
                snippetItem.detail = "Maven Snippet";
                snippetItem.command = {
                    title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
                    arguments: [{ completeFor: "dependency", source: "snippet" }]
                };
                ret.push(snippetItem);
                break;
            }
            case XmlTagName.Plugins: {
                const snippetItem: vscode.CompletionItem = new vscode.CompletionItem("plugin", vscode.CompletionItemKind.Snippet);
                const snippetContent: string = trimBrackets(pluginSnippetString(eol), documentText, cursorOffset);
                const pluginSnippet: vscode.SnippetString = new vscode.SnippetString(snippetContent);
                snippetItem.insertText = pluginSnippet;
                snippetItem.detail = "Maven Snippet";
                snippetItem.command = {
                    title: "selected", command: COMMAND_COMPLETION_ITEM_SELECTED,
                    arguments: [{ completeFor: "plugin", source: "snippet" }]
                };
                ret.push(snippetItem);
                break;
            }
            default:
        }
        return ret;
    }
}