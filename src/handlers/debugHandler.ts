// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { default as getPort } from "get-port";
import * as vscode from "vscode";
import { createUuid } from "vscode-extension-telemetry-wrapper";
import { PluginGoal } from "../explorer/model/PluginGoal";
import { Settings } from "../Settings";
import { executeInTerminal } from "../utils/mavenUtils";

export async function debugHandler(goal: PluginGoal): Promise<void> {
    if (!isJavaDebuggerEnabled()) {
        return;
    }

    const pomPath: string = goal.plugin.project.pomPath;
    const command: string = goal.name;
    await debug(pomPath, command);
}

async function debug(pomPath: string, command: string): Promise<void> {
    const freePort: number = await getPort();
    const mavenOpts: string = [
        Settings.getEnvironment().MAVEN_OPTS, // user-setting MAVEN_OPTS
        `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=${freePort}` // MAVEN_DEBUG_OPTS
    ].filter(Boolean).join(" ");
    const sessionId: string = createUuid().substr(0, 6);
    const debugTerimnal: vscode.Terminal = await executeInTerminal(command, pomPath, {
        name: `mvnDebug ${sessionId}: ${command}`,
        env: { MAVEN_OPTS: mavenOpts }
    });
    const debugConfig: vscode.DebugConfiguration = {
        type: "java",
        name: `Maven (Attach) - ${sessionId}`,
        request: "attach",
        hostName: "localhost",
        port: freePort,
        terminalName: debugTerimnal.name
    };
    setTimeout(async () => {
        await vscode.debug.startDebugging(undefined, debugConfig);
        debugTerimnal.show(true);
    }, 1000 /* wait 1s for mvnDebug startup */);
}

function isJavaDebuggerEnabled(): boolean {
    const javaDebuggerExtension: vscode.Extension<any> = vscode.extensions.getExtension("vscjava.vscode-java-debug");
    if (javaDebuggerExtension === undefined) {
        guideToInstallJavaDebugger();
        return false;
    }
    return true;
}

async function guideToInstallJavaDebugger(): Promise<void> {
    const BUTTON_CONFIRM: string = "View Details";
    const choice: string = await vscode.window.showInformationMessage("Debugger for Java is required for debugging, please install and enable it.", BUTTON_CONFIRM);
    if (choice === BUTTON_CONFIRM) {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/vscjava.vscode-java-debug"));
    }
}
