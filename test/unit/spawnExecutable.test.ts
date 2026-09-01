// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import * as child_process from "child_process";
import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import { spawnExecutable } from "../../src/utils/spawnExecutable";

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

    it("rejects line breaks before launching Windows batch files", function() {
        if (process.platform !== "win32") {
            this.skip();
        }

        assert.throws(
            () => spawnExecutable("mvn.cmd", ["validate\r\n& calc.exe"], {}),
            /Windows batch arguments cannot contain line breaks/
        );
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
