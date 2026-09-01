// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { spawn } from "batspawn";
import * as child_process from "child_process";

export function spawnExecutable(command: string, args: readonly string[], options: child_process.SpawnOptions): child_process.ChildProcess {
    const normalizedCommand = process.platform === "win32"
        ? command.replace(/\.(?:bat|cmd)$/i, extension => extension.toLowerCase())
        : command;
    return spawn(normalizedCommand, [...args], options);
}
