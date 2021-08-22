// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { default as getPort } from "get-port";
import * as vscode from "vscode";
import { createUuid } from "vscode-extension-telemetry-wrapper";
import { PluginGoal } from "../explorer/model/PluginGoal";
import { Settings } from "../Settings";
import { executeInTerminal } from "../utils/mavenUtils";

export async function debugHandler(goal: PluginGoal): Promise<void> {
    await debugCommand({
        command: goal.name,
        pomfile: goal.plugin.project.pomPath,
        projectName: goal.plugin.project.artifactId
    });
}

export interface IDebugOptions {
    readonly command: string;
    readonly pomfile: string;
    readonly projectName: string;
}

export async function debugCommand(options: IDebugOptions): Promise<void> {
    if (!isJavaDebuggerEnabled()) {
        await guideToInstallJavaDebugger();
        return;
    }
    await debug(options);
}

async function debug({ command, pomfile, projectName }: IDebugOptions): Promise<void> {
    const freePort: number = await getPort();
    const mavenOpts: string = [
        Settings.getEnvironment(pomfile).MAVEN_OPTS, // user-setting MAVEN_OPTS
        `-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=${freePort}` // MAVEN_DEBUG_OPTS
    ].filter(Boolean).join(" ");
    const sessionId: string = createUuid().substr(0, 6);
    const debugTerminal: vscode.Terminal | undefined = await executeInTerminal({
        command,
        pomfile,
        terminalName: `mvnDebug ${sessionId}: ${command}`,
        env: { MAVEN_OPTS: mavenOpts }
    });
    if (!debugTerminal) {
        return;
    }

    const debugConfig: vscode.DebugConfiguration = {
        type: "java",
        name: `Maven (Attach) - ${sessionId}`,
        request: "attach",
        hostName: "localhost",
        port: freePort,
        projectName,
        terminalName: debugTerminal.name
    };
    setTimeout(async () => {
        await vscode.debug.startDebugging(undefined, debugConfig);
        debugTerminal.show(true);
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
