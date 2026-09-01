// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as child_process from "child_process";

const CMD_META_CHARACTERS = "()]%!^\"`<>&|;, *?";

export function spawnExecutable(command: string, args: readonly string[], options: child_process.SpawnOptions): child_process.ChildProcess {
    if (process.platform !== "win32" || !/\.(cmd|bat)$/i.test(command)) {
        return child_process.spawn(command, [...args], { ...options, shell: false });
    }

    const shellCommand = [
        escapeCmdMetaCharacters(command),
        ...args.map(escapeWindowsBatchArgument)
    ].join(" ");
    return child_process.spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/v:off", "/c", `"${shellCommand}"`], {
        ...options,
        shell: false,
        windowsVerbatimArguments: true
    });
}

function escapeWindowsBatchArgument(arg: string): string {
    if (arg.includes("\r") || arg.includes("\n")) {
        throw new Error("Windows batch arguments cannot contain line breaks.");
    }

    let quoted = "\"";
    let backslashCount = 0;
    for (const char of arg) {
        if (char === "\\") {
            backslashCount++;
            continue;
        }
        if (char === "\"") {
            quoted += "\\".repeat(backslashCount * 2 + 1);
        } else {
            quoted += "\\".repeat(backslashCount);
        }
        quoted += char;
        backslashCount = 0;
    }
    quoted += "\\".repeat(backslashCount * 2) + "\"";

    // Batch launchers expand %* and parse the arguments a second time.
    return escapeCmdMetaCharacters(escapeCmdMetaCharacters(quoted));
}

function escapeCmdMetaCharacters(value: string): string {
    let escaped = "";
    for (const char of value) {
        if (CMD_META_CHARACTERS.includes(char)) {
            escaped += "^";
        }
        escaped += char;
    }
    return escaped;
}
