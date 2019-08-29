// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { JavaExtensionNotActivatedError } from "../Errors";

const JAVA_EXTENSION_ID: string = "redhat.java";
const JAVA_EXECUTE_WORKSPACE_COMMAND: string = "java.execute.workspaceCommand";

// tslint:disable-next-line:export-name
export function executeJavaLanguageServerCommand(...rest: any[]): any {
    if (!isJavaExtEnabled()) {
        throw new JavaExtensionNotActivatedError(
            `Cannot execute command ${JAVA_EXECUTE_WORKSPACE_COMMAND}, VS Code Java Extension is not enabled.`);
    }
    return vscode.commands.executeCommand(JAVA_EXECUTE_WORKSPACE_COMMAND, ...rest);
}

function isJavaExtEnabled(): boolean {
    const javaExt: vscode.Extension<any> | undefined = vscode.extensions.getExtension(JAVA_EXTENSION_ID);
    return !!javaExt;
}
