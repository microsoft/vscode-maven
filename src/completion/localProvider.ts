// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fg from "fast-glob";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { ElementNode, getCurrentNode } from "./lexerUtils";

class LocalProvider implements vscode.CompletionItemProvider {
    public localRepository: string;
    public metadata: {
        [groupId: string]: {
            [artifactId: string]: {
                [version: string]: true
            }
        }
    };

    public async initialize(repo?: string): Promise<void> {
        if (this.metadata !== undefined) {
            return;
        }

        this.metadata = {};
        this.localRepository = repo || path.join(os.homedir(), ".m2", "repository");
        return new Promise<void>((resolve, reject) => {
            fg.stream(["**/*.pom"], { cwd: this.localRepository })
                .on("data", (chunk: string) => {
                    const segs: string[] = chunk.split("/");
                    if (segs.length > 3) {
                        const version: string = segs[segs.length - 2];
                        const artifactId: string = segs[segs.length - 3];
                        const groupId: string = segs.slice(0, segs.length - 3).join(".");
                        _.set(this.metadata, [groupId, artifactId, version], true);
                    }
                })
                .on("error", reject)
                .on("end", resolve);
        });
    }

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
            return this.completeForGroupId(targetRange);
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

    private completeForGroupId(targetRange: vscode.Range): vscode.CompletionList {
        if (!this.metadata) {
            return null;
        }

        const validGroupIds: string[] = Object.keys(this.metadata);
        const groupIdItems: vscode.CompletionItem[] = validGroupIds.map(gid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(gid, vscode.CompletionItemKind.Module);
            item.insertText = gid;
            item.range = targetRange;
            item.detail = "local";
            return item;
        });
        return new vscode.CompletionList(groupIdItems, false);
    }

    private completeForArtifactId(targetRange: vscode.Range, groupId: string): vscode.CompletionList {
        if (!this.metadata || !groupId) {
            return null;
        }

        const artifactIdMap: {} = this.metadata[groupId];
        if (!artifactIdMap) {
            return null;
        }

        const validArtifactIds: string[] = Object.keys(artifactIdMap);
        const artifactIdItems: vscode.CompletionItem[] = validArtifactIds.map(aid => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(aid, vscode.CompletionItemKind.Field);
            item.insertText = aid;
            item.range = targetRange;
            item.detail = "local";
            return item;
        });
        return new vscode.CompletionList(artifactIdItems, false);
    }

    private completeForVersion(targetRange: vscode.Range, groupId: string, artifactId: string): vscode.CompletionList {
        if (!this.metadata || !groupId || !artifactId) {
            return null;
        }

        const versionMap: {} = _.get(this.metadata, [groupId, artifactId]);
        const validVersions: string[] = Object.keys(versionMap);
        const versionItems: vscode.CompletionItem[] = validVersions.map(v => {
            const item: vscode.CompletionItem = new vscode.CompletionItem(v, vscode.CompletionItemKind.Constant);
            item.insertText = v;
            item.range = targetRange;
            item.detail = "local";
            return item;
        });
        return new vscode.CompletionList(versionItems, false);
    }

}

export const localProvider: LocalProvider = new LocalProvider();
