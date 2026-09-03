// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { getBatSpawnArgs } from "batspawn";
import * as child_process from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as which from "which";

export function spawnExecutable(command: string, args: readonly string[], options: child_process.SpawnOptions): child_process.ChildProcess {
    const executable = resolveExecutablePath(command, options);
    if (!executable) {
        const error: NodeJS.ErrnoException = new Error(`Executable not found: ${command}`);
        error.code = "ENOENT";
        throw error;
    }
    const normalizedCommand = process.platform === "win32"
        ? executable.replace(/\.(?:bat|cmd)$/i, extension => extension.toLowerCase())
        : executable;
    if (process.platform === "win32" && /\.(?:bat|cmd)$/.test(normalizedCommand)) {
        const [, batchArgs, batchOptions] = getBatSpawnArgs(normalizedCommand, [...args], options);
        return child_process.spawn(windowsCommandProcessor(), batchArgs, batchOptions);
    }
    return child_process.spawn(normalizedCommand, [...args], options);
}

export function resolveExecutablePath(
    command: string,
    options: Pick<child_process.SpawnOptions, "cwd" | "env"> = {}
): string | undefined {
    const cwd: string = options.cwd instanceof URL
        ? fileURLToPath(options.cwd)
        : options.cwd ?? process.cwd();
    const environment: NodeJS.ProcessEnv = options.env ?? process.env;
    const pathExt: string | undefined = environmentValue(environment, "PATHEXT");

    const hasPathSeparator: boolean = command.includes(path.sep)
        || (process.platform === "win32" && command.includes("/"));
    if (hasPathSeparator) {
        const candidate: string = path.isAbsolute(command) ? command : path.resolve(cwd, command);
        return resolveCandidate(candidate, pathExt);
    }

    const searchPath: string | undefined = environmentValue(environment, "PATH");
    if (searchPath === undefined) {
        return undefined;
    }
    for (const entry of searchPath.split(path.delimiter)) {
        const pathEntry: string = stripSurroundingQuotes(entry);
        if (process.platform === "win32" && pathEntry === "") {
            continue;
        }
        const directory: string = path.resolve(cwd, pathEntry || ".");
        const executable: string | undefined = resolveCandidate(path.join(directory, command), pathExt);
        if (executable) {
            return executable;
        }
    }
    return undefined;
}

export function mergeEnvironment(
    base: NodeJS.ProcessEnv,
    overrides: { [key: string]: string }
): NodeJS.ProcessEnv {
    const merged: NodeJS.ProcessEnv = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
        if (process.platform === "win32") {
            for (const existingKey of Object.keys(merged)) {
                if (existingKey.toUpperCase() === key.toUpperCase()) {
                    delete merged[existingKey];
                }
            }
        }
        merged[key] = value;
    }
    return merged;
}

function resolveCandidate(candidate: string, pathExt: string | undefined): string | undefined {
    if (process.platform === "win32") {
        if (path.extname(candidate) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
        const pathExtensions: string[] = (pathExt === undefined ? ".COM;.EXE;.BAT;.CMD" : pathExt)
            .split(path.delimiter)
            .map(extension => stripSurroundingQuotes(extension.trim()))
            .filter(extension => extension.length > 0);
        const extensions: string[] = [".EXE", ...pathExtensions]
            .filter((extension, index, all) =>
                all.findIndex(candidate => candidate.toUpperCase() === extension.toUpperCase()) === index);
        for (const extension of extensions) {
            const executable = `${candidate}${extension.startsWith(".") ? extension : `.${extension}`}`;
            if (fs.existsSync(executable) && fs.statSync(executable).isFile()) {
                return executable;
            }
        }
        return undefined;
    }
    const resolved: string | null = which.sync(candidate, {
        nothrow: true
    });
    return resolved ?? undefined;
}

function environmentValue(environment: NodeJS.ProcessEnv, name: string): string | undefined {
    if (process.platform !== "win32") {
        return environment[name];
    }
    const key: string | undefined = Object.keys(environment)
        .sort()
        .find(candidate => candidate.toUpperCase() === name);
    return key === undefined ? undefined : environment[key];
}

function stripSurroundingQuotes(value: string): string {
    return value.startsWith("\"") && value.endsWith("\"") ? value.slice(1, -1) : value;
}

function windowsCommandProcessor(): string {
    const systemRoot: string | undefined = environmentValue(process.env, "SystemRoot")
        ?? environmentValue(process.env, "WINDIR");
    const candidates: Array<string | undefined> = [
        systemRoot && path.join(systemRoot, "System32", "cmd.exe"),
        environmentValue(process.env, "ComSpec")
    ];
    for (const candidate of candidates) {
        if (candidate
            && path.isAbsolute(candidate)
            && path.basename(candidate).toLowerCase() === "cmd.exe"
            && fs.existsSync(candidate)
            && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    const error: NodeJS.ErrnoException = new Error("Windows command processor not found.");
    error.code = "ENOENT";
    throw error;
}
