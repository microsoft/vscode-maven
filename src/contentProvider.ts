// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { IEffectivePom } from "./explorer/model/IEffectivePom";
import { MavenProject } from "./explorer/model/MavenProject";
import { getDependencyTree } from "./handlers/dependency/showDependenciesHandler";
import { MavenProjectManager } from "./project/MavenProjectManager";
import { Utils } from "./utils/Utils";

/**
 * URI patterns.
 * vscode-maven://dependencies/<pom-path>/Dependencies?<pom-path>
 * vscode-maven://effective-pom/<pom-path>/EffectivePOM.xml?<pom-path>
 * vscode-maven:///<pom-path-in-local-maven-repository>
 */
class MavenContentProvider implements vscode.TextDocumentContentProvider {

    public readonly onDidChange: vscode.Event<vscode.Uri>;
    private _onDidChangeEmitter: vscode.EventEmitter<vscode.Uri>;

    constructor() {
        this._onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
        this.onDidChange = this._onDidChangeEmitter.event;
    }

    public invalidate(uri: vscode.Uri): void {
        this._onDidChangeEmitter.fire(uri);
    }

    public async provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): Promise<string | undefined> {
        if (uri.scheme !== "vscode-maven") {
            throw new Error(`Scheme ${uri.scheme} not supported by this content provider.`);
        }

        const pomPath = uri.query;
        switch (uri.authority) {
            case "dependencies":
                return getDependencyTree(pomPath);
            case "effective-pom": {
                const project: MavenProject | undefined = MavenProjectManager.get(pomPath);
                if (project) {
                    const effectivePom: IEffectivePom = await project.getEffectivePom();
                    return effectivePom.ePomString;
                } else {
                    return Utils.getEffectivePom(pomPath);
                }
            }
            case "local-repository":{
                const fsUri = uri.with({ scheme: "file", authority: "" });
                return (await vscode.workspace.fs.readFile(fsUri)).toString();
            }
            default:
        }
        return undefined;
    }
}

export const contentProvider: MavenContentProvider = new MavenContentProvider();
