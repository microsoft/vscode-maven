// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { default as getPort } from "get-port";
import * as vscode from "vscode";
import { createUuid } from "vscode-extension-telemetry-wrapper";
import { PluginGoal } from "../explorer/model/PluginGoal";
import { Settings } from "../Settings";
import { executeInTerminal } from "../utils/mavenUtils";

export async function debugHandler(goal: PluginGoal): Promise<void> {
    // TODO: vscode-java-debug installation check
    const pomPath: string = goal.plugin.project.pomPath;
    const command: string = goal.name;
    return await debug(pomPath, command);
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
