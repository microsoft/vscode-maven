// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Wrapper that invokes mocha for the unit-test suite.
 *
 * Why this exists:
 *   Node 22.6+ ships `--experimental-strip-types` (on by default since 22.18).
 *   When that flag is enabled, Mocha can load newly added `test/unit/*.test.ts`
 *   files through Node's native ESM strip-types loader instead of the
 *   `ts-node/register/transpile-only` CommonJS hook configured in
 *   `.mocharc.json`. That breaks any test file that uses `require()`
 *   (e.g. for `proxyquire`) with:
 *     ReferenceError: require is not defined in ES module scope
 *
 *   The fix is to pass `--no-experimental-strip-types` to Node so that all
 *   `.ts` test files load uniformly via ts-node. But that flag does not
 *   exist on Node 20, where the project's CI still runs, so we cannot put
 *   it directly in `.mocharc.json` — Node 20 would reject it as
 *   `bad option`.
 *
 *   This wrapper detects the Node version at runtime and only forwards
 *   the flag on Node 22.6+. Node 20 runs mocha exactly as before.
 */

"use strict";

const { spawn } = require("child_process");

const [major, minor] = process.versions.node.split(".").map(Number);
const supportsStripTypesFlag = major > 22 || (major === 22 && minor >= 6);

const nodeArgs = [];
if (supportsStripTypesFlag) {
    nodeArgs.push("--no-experimental-strip-types");
}
nodeArgs.push(require.resolve("mocha/bin/mocha.js"));
nodeArgs.push(...process.argv.slice(2));

const child = spawn(process.execPath, nodeArgs, { stdio: "inherit" });
child.on("close", code => process.exit(code ?? 1));
child.on("error", err => {
    console.error(err);
    process.exit(1);
});
