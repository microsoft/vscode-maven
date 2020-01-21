// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { default as getPort } from "get-port";
import * as vscode from "vscode";
import { createUuid } from "vscode-extension-telemetry-wrapper";
import { PluginGoal } from "../explorer/model/PluginGoal";
import { Settings } from "../Settings";
import { executeInTerminal } from "../utils/mavenUtils";

export async function debugHandler(goal: PluginGoal): Promise<void> {
    const pomfile: string = goal.plugin.project.pomPath;
    const command: string = goal.name;
    await debugCommand({ command, pomfile });
}

export async function debugCommand(options: { pomfile: string; command: string }): Promise<void> {
    if (!isJavaDebuggerEnabled()) {
        await guideToInstallJavaDebugger();
        return;
    }
    await debug(options.pomfile, options.command);
}

async function debug(pomPath: string, command: string): Promise<void> {
    const freePort: number = await getPort();
    const mavenOpts: string = [
        Settings.getEnvironment().MAVEN_OPTS, // user-setting MAVEN_OPTS
        `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=${freePort}` // MAVEN_DEBUG_OPTS
    ].filter(Boolean).join(" ");
    const sessionId: string = createUuid().substr(0, 6);
    const debugTerimnal: vscode.Terminal | undefined = await executeInTerminal({
        command,
        pomfile: pomPath,
        terminalName: `mvnDebug ${sessionId}: ${command}`,
        env: { MAVEN_OPTS: mavenOpts }
    });
    if (!debugTerimnal) {
        return;
    }

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
    const javaDebuggerExtension: vscode.Extension<any> | undefined = vscode.extensions.getExtension("vscjava.vscode-java-debug");
    return javaDebuggerExtension !== undefined;
}

async function guideToInstallJavaDebugger(): Promise<void> {
    const BUTTON_CONFIRM: string = "View Details";
    const choice: string | undefined = await vscode.window.showInformationMessage("Debugger for Java is required for debugging, please install and enable it.", BUTTON_CONFIRM);
    if (choice === BUTTON_CONFIRM) {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/vscjava.vscode-java-debug"));
    }
}
