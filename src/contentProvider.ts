// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenExplorerProvider } from "./explorer/mavenExplorerProvider";
import { IEffectivePom } from "./explorer/model/IEffectivePom";
import { MavenProject } from "./explorer/model/MavenProject";
import { getDependencyTree } from "./handlers/showDependenciesHandler";
import { Utils } from "./utils/Utils";

class MavenContentProvider implements vscode.TextDocumentContentProvider {
    public async provideTextDocumentContent(uri: vscode.Uri, _token: vscode.CancellationToken): Promise<string | undefined> {
        if (uri.scheme !== "vscode-maven") {
            throw new Error(`Scheme ${uri.scheme} not supported by this content provider.`);
        }

        const pomPath = uri.query;
        switch (uri.authority) {
            case "dependencies":
                return getDependencyTree(pomPath);
            case "effective-pom":
                const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
                if (project) {
                    const effectivePom: IEffectivePom = await project.getEffectivePom();
                    return effectivePom.ePomString;
                } else {
                    return Utils.getEffectivePom(pomPath);
                }
            default:
        }
        return undefined;

    }
}

export const contentProvider: MavenContentProvider = new MavenContentProvider();
