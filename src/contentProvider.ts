// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import * as path from "path";
import * as vscode from "vscode";
import { IEffectivePom } from "./explorer/model/IEffectivePom";
import { MavenProject } from "./explorer/model/MavenProject";
import { getDependencyTree } from "./handlers/dependency/showDependenciesHandler";
import { MavenProjectManager } from "./project/MavenProjectManager";
import { UserError } from "./utils/errorUtils";
import { ensureWorkspaceTrusted, MavenExecutionGuard } from "./utils/mavenUtils";
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
        const beforeExecute = uri.authority === "dependencies" || uri.authority === "effective-pom"
            ? await this.validatePomPath(pomPath)
            : undefined;
        switch (uri.authority) {
            case "dependencies":
                return getDependencyTree(pomPath, beforeExecute);
            case "effective-pom": {
                const project: MavenProject | undefined = MavenProjectManager.get(pomPath);
                if (project) {
                    const effectivePom: IEffectivePom | undefined = await project.getEffectivePom({ beforeExecute });
                    return effectivePom?.ePomString;
                } else {
                    return Utils.getEffectivePom(pomPath, beforeExecute);
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

    private async validatePomPath(pomPath: string): Promise<MavenExecutionGuard> {
        const resolvePomPath = async () => {
            ensureWorkspaceTrusted();
            const folder = path.isAbsolute(pomPath) ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(pomPath)) : undefined;
            if (!folder) {
                throw new UserError("Maven content requires an absolute POM path inside the current workspace.");
            }

            const [canonicalPomPath, canonicalFolderPath] = await Promise.all([
                fs.realpath(pomPath),
                fs.realpath(folder.uri.fsPath)
            ]);
            const relativePath = path.relative(canonicalFolderPath, canonicalPomPath);
            if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
                throw new UserError("The requested POM resolves outside its workspace folder.");
            }
            if (!(await fs.stat(canonicalPomPath)).isFile()) {
                throw new UserError("The requested POM is not a file.");
            }
            ensureWorkspaceTrusted();
            return { canonicalPomPath, canonicalFolderPath };
        };

        const initial = await resolvePomPath();
        return async () => {
            const current = await resolvePomPath();
            if (path.relative(initial.canonicalPomPath, current.canonicalPomPath) !== ""
                || path.relative(initial.canonicalFolderPath, current.canonicalFolderPath) !== "") {
                throw new UserError("The requested POM or its workspace folder changed. Reopen the Maven document to try again.");
            }
        };
    }
}

export const contentProvider: MavenContentProvider = new MavenContentProvider();
