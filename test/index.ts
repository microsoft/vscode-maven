// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from "@vscode/test-electron";
import * as cp from "child_process";
import * as os from "os";
import * as path from "path";

async function main(): Promise<void> {
    try {
        const vscodeExecutablePath = await downloadAndUnzipVSCode();

        const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
        cp.spawnSync(cli, [...args, '--install-extension', 'redhat.java'], {
            encoding: 'utf-8',
            stdio: 'inherit',
            shell: true,
        });

        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath: string = path.resolve(__dirname, "../../");

        // Run test for maven project
        await runTests({
            vscodeExecutablePath,
            extensionDevelopmentPath,
            extensionTestsPath: path.resolve(__dirname, "./maven-suite"),
            launchArgs: [
                path.join(__dirname, "..", "..", "test", "projects", "maven"),
                "--disable-workspace-trust",
            ],
        });

        process.exit(0);

    } catch (err) {
        process.stdout.write(`${err}${os.EOL}`);
        process.exit(1);
    }
}

main();
