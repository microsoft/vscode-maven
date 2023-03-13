// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { JavaExtensionNotActivatedError } from "../utils/errorUtils";

const JAVA_EXTENSION_ID = "redhat.java";
const JAVA_EXECUTE_WORKSPACE_COMMAND = "java.execute.workspaceCommand";

// tslint:disable-next-line:export-name
export function executeJavaLanguageServerCommand<R>(...rest: unknown[]): Promise<R> {
    if (!isJavaExtEnabled()) {
        throw new JavaExtensionNotActivatedError(
            `Cannot execute command ${JAVA_EXECUTE_WORKSPACE_COMMAND}, VS Code Java Extension is not enabled.`);
    }
    return vscode.commands.executeCommand<R>(JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest) as Promise<R>;
}

export function isJavaExtEnabled(): boolean {
    const javaExt: vscode.Extension<unknown> | undefined = getJavaExtension();
    return !!javaExt;
}

export function isJavaExtActivated(): boolean {
    const javaExt: vscode.Extension<unknown> | undefined = getJavaExtension();
    return !!javaExt && javaExt.isActive;
}

export function getJavaExtension(): vscode.Extension<unknown> | undefined {
    return vscode.extensions.getExtension(JAVA_EXTENSION_ID);
}

export function  isJavaLangugageServerStarndard(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const javaExt: vscode.Extension<any> | undefined = getJavaExtension();
    return javaExt?.exports?.api?.serverMode === "Standard";
}
