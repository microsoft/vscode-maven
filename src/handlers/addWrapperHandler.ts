// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fse from "fs-extra";
import { getPathToExtensionRoot } from "../utils/contextUtils";
import { mavenDitributionExisting } from "../utils/requestUtils";

const DEFAULT_MAVEN_VERSION: string = "3.6.3";
const DEFAULT_WRAPPER_VERSION: string = "0.5.5";


function wrapperProps(mavenVersion?: string, wrapperVersion?: string): string {
    const vMaven = mavenVersion ?? DEFAULT_MAVEN_VERSION;
    const vWrapper = wrapperVersion ?? DEFAULT_WRAPPER_VERSION;
    return `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/${vMaven}/apache-maven-${vMaven}-bin.zip`
        + os.EOL
        + `wrapperUrl=https://repo.maven.apache.org/maven2/io/takari/maven-wrapper/${vWrapper}/maven-wrapper-${vWrapper}.jar`
        + os.EOL;
}

export async function addWrapperHandler() {
    if (vscode.workspace.workspaceFolders === undefined || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showInformationMessage("Cancelled as no open workspace folder detected.");
        return;
    }

    const targetWorkspaceFolder: vscode.WorkspaceFolder | undefined = vscode.workspace.workspaceFolders.length === 1 ? vscode.workspace.workspaceFolders[0]
        : await vscode.window.showQuickPick(vscode.workspace.workspaceFolders.map(w => ({ ...w, label: w.name })));
    if (targetWorkspaceFolder === undefined) {
        return;
    }

    const targetFolder = targetWorkspaceFolder.uri.fsPath;
    if (await fse.pathExists(path.join(targetFolder, "mvnw")) && await fse.pathExists(path.join(targetFolder, ".mvn"))) {
        const BUTTON_PROCEED: string = "Proceed";
        const choice = await vscode.window.showInformationMessage("Exisiting Maven wrapper detected, proceed to overwrite?",
            BUTTON_PROCEED
        );
        if (choice !== BUTTON_PROCEED) {
            return;
        }
    }

    const mavenVersionValidator = (v: string) => {
        if (v.match(/^\d+\.\d+\.\d+$/) === null) {
            return "Invalid Maven Version.";
        } else {
            return null;
        }
    };

    const mavenVersion = await vscode.window.showInputBox({
        value: DEFAULT_MAVEN_VERSION,
        prompt: "input Maven version",
        validateInput: mavenVersionValidator
    });

    if (mavenVersion === undefined) {
        return;
    }

    // verify if current version exists on Maven central
    if (mavenVersion !== DEFAULT_MAVEN_VERSION /* skip check default version to boost */) {
        const valid = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Validating Maven Version..."
        }, async (_progress) => {
            return await mavenDitributionExisting(mavenVersion);
        });

        if (!valid) {
            await vscode.window.showWarningMessage(`Maven distribution ${mavenVersion} is not available in Central Repository.`);
            return;
        }
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Adding Maven Wrapper..."
    }, async (_progress) => {
        const wrapperFolder: string = getPathToExtensionRoot("resources", "maven-wrapper");
        await fse.copy(wrapperFolder, targetFolder);
        // replace maven version
        const propsFile = path.join(targetFolder, ".mvn", "wrapper", "maven-wrapper.properties");
        const content = wrapperProps(mavenVersion);
        await fse.writeFile(propsFile, content);
    });
}