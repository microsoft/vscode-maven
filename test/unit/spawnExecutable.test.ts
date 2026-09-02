// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import { mergeEnvironment, resolveExecutablePath, spawnExecutable } from "../../src/utils/spawnExecutable";

describe("spawnExecutable", () => {
    it("preserves Windows batch arguments without shell expansion", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven % & spawn-"));
        try {
            const captureScript = path.join(tempDirectory, "capture.js");
            const batchFile = path.join(tempDirectory, "capture.cmd");
            const outputFile = path.join(tempDirectory, "arguments.json");
            const injectedFile = path.join(tempDirectory, "injected.txt");
            await fse.writeFile(captureScript, "require(\"fs\").writeFileSync(process.env.CAPTURE_OUTPUT, JSON.stringify(process.argv.slice(2)));");
            await fse.writeFile(batchFile, "@echo off\r\n\"%NODE_EXE%\" \"%CAPTURE_SCRIPT%\" %*\r\n");

            const args = [
                "",
                "value with spaces",
                "%PATH%",
                "!PATH!",
                "embedded\"quote",
                "backslash-before-quote\\\"",
                "trailing\\",
                "^ & | < > ( )",
                `safe & echo injected>"${injectedFile}" & rem`
            ];
            const processEnvironment: NodeJS.ProcessEnv = {
                ...process.env,
                CAPTURE_OUTPUT: outputFile,
                CAPTURE_SCRIPT: captureScript,
                NODE_EXE: process.execPath
            };
            const proc = spawnExecutable(batchFile, args, { env: processEnvironment });

            assert.equal(await waitForExit(proc), 0);
            assert.deepEqual(JSON.parse(await fse.readFile(outputFile, "utf8")), args);
            assert.equal(await fse.pathExists(injectedFile), false);
        } finally {
            await fse.remove(tempDirectory);
        }
    });

    it("rejects unsafe characters before launching Windows batch files", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-invalid-args-"));
        try {
            const batchFile = path.join(tempDirectory, "mvn.cmd");
            await fse.writeFile(batchFile, "@exit /b 0\r\n");
            for (const argument of ["null\0character", "carriage\rreturn", "line\nfeed"]) {
                assert.throws(
                    () => spawnExecutable(batchFile, [argument], {}),
                    /Invalid character in argument/
                );
            }
        } finally {
            await fse.remove(tempDirectory);
        }
    });

    it("supports uppercase Windows batch file extensions", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-uppercase-spawn-"));
        try {
            const captureScript = path.join(tempDirectory, "capture.js");
            const batchFile = path.join(tempDirectory, "capture.CMD");
            const outputFile = path.join(tempDirectory, "arguments.json");
            await fse.writeFile(captureScript, "require(\"fs\").writeFileSync(process.env.CAPTURE_OUTPUT, JSON.stringify(process.argv.slice(2)));");
            await fse.writeFile(batchFile, "@echo off\r\n\"%NODE_EXE%\" \"%CAPTURE_SCRIPT%\" %*\r\n");

            const proc = spawnExecutable(batchFile, ["argument"], {
                env: mergeEnvironment(process.env, {
                    CAPTURE_OUTPUT: outputFile,
                    CAPTURE_SCRIPT: captureScript,
                    NODE_EXE: process.execPath,
                    PATH: tempDirectory,
                    PATHEXT: ".EXE"
                })
            });

            assert.equal(await waitForExit(proc), 0);
            assert.deepEqual(JSON.parse(await fse.readFile(outputFile, "utf8")), ["argument"]);
        } finally {
            await fse.remove(tempDirectory);
        }
    });

    it("resolves extensionless commands using the child environment PATH", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-child-path-"));
        const hostBin = path.join(tempDirectory, "host");
        const childBin = path.join(tempDirectory, "child");
        const pathKey = Object.keys(process.env).find(key => key.toUpperCase() === "PATH") ?? "PATH";
        const originalPath: string | undefined = process.env[pathKey];
        try {
            await fse.ensureDir(hostBin);
            await fse.ensureDir(childBin);
            await fse.writeFile(path.join(hostBin, "mvn.cmd"), "@echo host\r\n");
            await fse.writeFile(path.join(childBin, "mvn.cmd"), "@echo child\r\n");
            process.env[pathKey] = [hostBin, originalPath].filter((value): value is string => !!value).join(path.delimiter);

            const childPath = [childBin, hostBin, originalPath].filter((value): value is string => !!value).join(path.delimiter);
            const childEnvironment = mergeEnvironment(process.env, {
                PATH: childPath,
                PATHEXT: ".CMD"
            });
            const proc = spawnExecutable("mvn", [], { env: childEnvironment });
            let stdout = "";
            proc.stdout?.on("data", (chunk: Buffer) => {
                stdout += chunk.toString();
            });

            assert.equal(await waitForExit(proc), 0);
            assert.equal(stdout.trim(), "child");
        } finally {
            if (originalPath === undefined) {
                delete process.env[pathKey];
            } else {
                process.env[pathKey] = originalPath;
            }
            await fse.remove(tempDirectory);
        }
    });

    it("does not fall back to the host PATHEXT when the child value is empty", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-empty-pathext-"));
        try {
            await fse.writeFile(path.join(tempDirectory, "mvn.cmd"), "@exit /b 0\r\n");
            const childEnvironment = mergeEnvironment(process.env, {
                PATH: tempDirectory,
                PATHEXT: ""
            });

            assert.equal(resolveExecutablePath("mvn", { env: childEnvironment }), undefined);
        } finally {
            await fse.remove(tempDirectory);
        }
    });

    it("resolves native Windows executables independently of PATHEXT", function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const childEnvironment = mergeEnvironment(process.env, {
            PATH: path.dirname(process.execPath),
            PATHEXT: ""
        });
        assert.equal(
            resolveExecutablePath(path.basename(process.execPath, ".exe"), { env: childEnvironment })?.toLowerCase(),
            process.execPath.toLowerCase()
        );
    });

    it("applies PATHEXT to dotted Windows command names", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-dotted-command-"));
        try {
            const command = path.join(tempDirectory, "mvn.3.cmd");
            await fse.writeFile(command, "@exit /b 0\r\n");
            const childEnvironment = mergeEnvironment(process.env, {
                PATH: tempDirectory,
                PATHEXT: ".CMD"
            });

            assert.equal(resolveExecutablePath("mvn.3", { env: childEnvironment })?.toLowerCase(), command.toLowerCase());
        } finally {
            await fse.remove(tempDirectory);
        }
    });

    it("does not resolve Windows commands through an empty PATH entry", async function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        const tempDirectory = await fse.mkdtemp(path.join(os.tmpdir(), "vscode-maven-empty-path-entry-"));
        try {
            await fse.writeFile(path.join(tempDirectory, "mvn.cmd"), "@exit /b 0\r\n");
            const missingDirectory = path.join(tempDirectory, "missing");
            const childEnvironment = mergeEnvironment(process.env, {
                PATH: `${missingDirectory}${path.delimiter}${path.delimiter}${missingDirectory}`,
                PATHEXT: ".CMD",
                NoDefaultCurrentDirectoryInExePath: "1"
            });

            assert.equal(resolveExecutablePath("mvn", { cwd: tempDirectory, env: childEnvironment }), undefined);
        } finally {
            await fse.remove(tempDirectory);
        }
    });
});

function waitForExit(proc: child_process.ChildProcess): Promise<number> {
    return new Promise<number>((resolve, reject): void => {
        proc.once("error", reject);
        proc.once("exit", (code: number | null, signal: NodeJS.Signals | null): void => {
            if (code === null) {
                reject(new Error(`Process terminated by signal ${signal}.`));
            } else {
                resolve(code);
            }
        });
    });
}
