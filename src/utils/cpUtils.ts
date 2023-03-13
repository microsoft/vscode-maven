// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as vscode from "vscode";
import { mavenOutputChannel } from "../mavenOutputChannel";

export async function executeCommand(command: string, args: string[], options: cp.SpawnOptions = { shell: true }): Promise<string> {
    return new Promise((resolve: (res: string) => void, reject: (e: Error) => void): void => {
        mavenOutputChannel.appendLine(`${command}, [${args.join(",")}]`);
        let result = "";
        const childProc: cp.ChildProcess = cp.spawn(command, args, options);
        if (childProc.stdout !== null) {
            childProc.stdout.on("data", (data: string | Buffer) => {
                data = data.toString();
                result = result.concat(data);
            });
        }
        childProc.on("error", reject);
        childProc.on("close", (code: number) => {
            if (code !== 0 || result.indexOf("ERROR") > -1) {
                reject(new Error(`Command "${command} ${args.toString()}" failed with exit code "${code}".`));
            } else {
                resolve(result);
            }
        });
    });
}

export async function executeCommandWithProgress(message: string, command: string, args: string[], options: cp.SpawnOptions = { shell: true }): Promise<string> {
    let result = "";
    await vscode.window.withProgress<void>({ location: vscode.ProgressLocation.Window }, async (p: vscode.Progress<{ message?: string; increment?: number }>) => {
        mavenOutputChannel.appendLine(`${command}, [${args.join(",")}]`);
        return new Promise<void>((resolve, reject) => {
            p.report({ message });
            executeCommand(command, args, options).then((value) => {
                result = value;
                resolve();
            }).catch(reject);
        });
    });
    return result;
}
