// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as cp from "child_process";
import * as os from "os";
import * as path from "path";
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from "vscode-test";

async function main(): Promise<void> {
    try {
        const vscodeExecutablePath = await downloadAndUnzipVSCode();
        // Platform-specific when using @vscode/test-electron
        // let platform;
        // switch (os.platform()) {
        //     case "linux":
        //         platform = "linux-x64";
        //         break;
        //     case "win32":
        //         platform = "win32-x64-archive";
        //         break;
        //     case "darwin":
        //         platform = os.arch() === "arm64" ? "darwin-arm64" : "darwin"
        //         break;
        //     default:
        //         console.error(`unsupported platform: ${os.platform()}`);
        //         return;
        // }
        // const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath, platform);
        const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);

        // Resolve extension dependencies
        cp.spawnSync(cliPath, ["--install-extension", "redhat.java"], {
            encoding: "utf-8",
            stdio: "inherit",
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
