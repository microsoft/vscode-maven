// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ElementNode, getCurrentNode } from "./lexerUtils";

class LocalProvider implements vscode.CompletionItemProvider {
    public localRepository: string = path.join(os.homedir(), ".m2", "repository");  // TODO: use effective m2 home.

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        const currentNode: ElementNode = getCurrentNode(document, position);
        if (!currentNode) {
            return null;
        }

        const targetRange: vscode.Range = new vscode.Range(
            currentNode.offset ? document.positionAt(currentNode.offset) : position,
            position
        );

        if (currentNode.tag === "groupId") {
            return this.completeForGroupId(targetRange, currentNode.text);
        }
        if (currentNode.tag === "artifactId" && currentNode.parent) {
            const groupIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "groupId");
            if (!groupIdNode) {
                return null;
            }

            return this.completeForArtifactId(targetRange, groupIdNode.text);
        }
        if (currentNode.tag === "version" && currentNode.parent) {
            const groupIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "groupId");
            if (!groupIdNode) {
                return null;
            }

            const artifactIdNode: ElementNode = currentNode.parent.children.find(elem => elem.tag === "artifactId");
            if (!artifactIdNode) {
                return null;
            }

            return this.completeForVersion(targetRange, groupIdNode.text, artifactIdNode.text);
        }
        return null;
    }

    private async completeForGroupId(targetRange: vscode.Range, groupIdHint: string): Promise<vscode.CompletionList> {
        const packageSegments: string[] = groupIdHint.split(".");
        packageSegments.pop();
        const validGroupIds: string[] = await this.searchForGroupIds(packageSegments);
        const groupIdItems: vscode.CompletionItem[] = validGroupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.range = targetRange;
            item.detail = "local";
            return item;
        });
        return new vscode.CompletionList(groupIdItems, false);
    }

    private async completeForArtifactId(targetRange: vscode.Range, groupId: string): Promise<vscode.CompletionList> {
        if (!groupId) {
            return null;
        }

        const validArtifactIds: string[] = await this.searchForArtifactIds(groupId);
        const artifactIdItems: vscode.CompletionItem[] = validArtifactIds.map(aid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(aid, vscode.CompletionItemKind.Field);
            item.insertText = aid;
            item.range = targetRange;
            item.detail = "local";
            return item;
        });
        return new vscode.CompletionList(artifactIdItems, false);
    }

    private async completeForVersion(targetRange: vscode.Range, groupId: string, artifactId: string): Promise<vscode.CompletionList> {
        if (!groupId || !artifactId) {
            return null;
        }

        const validVersions: string[] = await this.searchForVersions(groupId, artifactId);
        const versionItems: vscode.CompletionItem[] = validVersions.map(v => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(v, vscode.CompletionItemKind.Constant);
            item.insertText = v;
            item.range = targetRange;
            item.detail = "local";
            // TODO: use sortText to list latest version at top.
            return item;
        });
        return new vscode.CompletionList(versionItems, false);
    }

    private async searchForGroupIds(segments: string[]): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...segments);
        return new Promise<string[]>((resolve, reject) => {
            fg.async(["**", "!**/*.*"], { onlyFiles: false, deep: 2, cwd }).then(entries => {
                const validSegments: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                const prefix: string = _.isEmpty(segments) ? "" : [...segments, ""].join(".");
                const groupIds: string[] = Array.from(new Set(validSegments)).map(seg => `${prefix}${seg}`);
                resolve(groupIds);
            }).catch(reject);
        });
    }

    private async searchForArtifactIds(groupId: string): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...groupId.split("."));
        return await new Promise<string[]>((resolve, reject) => {
            fg.async(["**/*.pom"], { deep: 2, cwd }).then(entries => {
                const validArtifactIds: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                resolve(Array.from(new Set(validArtifactIds)));
            }).catch(reject);
        });
    }

    private async searchForVersions(groupId: string, artifactId: string): Promise<string[]> {
        const cwd: string = path.join(this.localRepository, ...groupId.split("."), artifactId);
        return await new Promise<string[]>((resolve, reject) => {
            fg.async(["*/*.pom"], { deep: 1, cwd }).then(entries => {
                const validVersions: string[] = entries.map((e: string) => e.substring(0, e.indexOf("/")));
                resolve(validVersions);
            }).catch(reject);
        });
    }

}

export const localProvider: LocalProvider = new LocalProvider();
