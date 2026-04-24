// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Unit tests for the executable-path safety checks introduced by PR #1152
 * (microsoft/vscode-maven). Uses proxyquire to stub out the heavy transitive
 * dependencies of `src/utils/mavenUtils.ts` (vscode API, Maven output channel,
 * terminal, project manager, settings, extension context) so we can exercise
 * `checkExecutablePathSafety` in isolation.
 */

import { strict as assert } from "assert";
import { vscodeMock, showWarningMessageStub, getWorkspaceFolderStub, resetStubs } from "./vscode-mock";

// proxyquire's default export is a callable function with helper methods —
// the default namespace import shape doesn't match, so require() it directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const proxyquire: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: string, stubs: Record<string, any>): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noPreserveCache: () => (request: string, stubs: Record<string, any>) => any;
} = require("proxyquire");

type SafetyResult = "safe" | "use-default" | "abort";
type MavenUtilsModule = {
    checkExecutablePathSafety: (p: string) => Promise<SafetyResult>;
};

// Load `mavenUtils` with all heavy imports stubbed. `noCallThru` keeps
// proxyquire from ever touching the real modules (critical for `vscode`
// which doesn't resolve at all outside the extension host). `@noCallThru`
// is applied per-stub so the real modules are never hit.
function loadMavenUtils(): MavenUtilsModule {
    // proxyquire caches per (filename, stubs) — reset the whole cache so
    // each test gets a fresh module-scoped `confirmedExecutablePaths` Set.
    const pq = proxyquire.noPreserveCache();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stub = (obj: Record<string, any>): Record<string, any> => ({ ...obj, "@noCallThru": true });

    return pq("../../src/utils/mavenUtils", {
        "vscode": stub(vscodeMock),
        "../mavenOutputChannel": stub({ mavenOutputChannel: { appendLine: () => undefined, show: () => undefined } }),
        "../mavenTerminal": stub({ mavenTerminal: { runInTerminal: async () => undefined } }),
        "../project/MavenProjectManager": stub({ MavenProjectManager: { get: () => undefined, projects: [] } }),
        "../Settings": stub({ Settings: { Executable: { path: () => undefined, options: () => "" } } }),
        "./contextUtils": stub({
            getPathToExtensionRoot: () => "/tmp/ext",
            getPathToTempFolder: () => "/tmp",
            getPathToWorkspaceStorage: () => "/tmp/ws"
        }),
        "../mavenProblemMatcher": stub({ mavenProblemMatcher: { dispose: () => undefined } }),
        "./errorUtils": stub({ MavenNotFoundError: class MavenNotFoundError extends Error {} }),
        "./historyUtils": stub({ updateLRUCommands: async () => undefined })
    }) as MavenUtilsModule;
}

describe("checkExecutablePathSafety — PR #1152", () => {

    beforeEach(() => {
        resetStubs();
    });

    describe("relative paths (always suspicious)", () => {
        it("returns 'safe' and caches when user clicks Allow", async () => {
            showWarningMessageStub.impl = async () => "Allow";
            const { checkExecutablePathSafety } = loadMavenUtils();

            const first = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(first, "safe");

            // Switch the stub so the test fails loudly if a second prompt is shown.
            let prompted = false;
            showWarningMessageStub.impl = async () => { prompted = true; return "Allow"; };
            const second = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(second, "safe");
            assert.equal(prompted, false, "Allow should cache the path so the second call does not prompt");
        });

        it("returns 'use-default' and does NOT cache when user clicks Use Default Maven", async () => {
            showWarningMessageStub.impl = async () => "Use Default Maven";
            const { checkExecutablePathSafety } = loadMavenUtils();

            const first = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(first, "use-default");

            let promptCount = 0;
            showWarningMessageStub.impl = async () => { promptCount += 1; return "Use Default Maven"; };
            const second = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(second, "use-default");
            assert.equal(promptCount, 1, "Use Default must NOT be cached — the second call must re-prompt");
        });

        it("returns 'abort' when user dismisses the dialog (Esc)", async () => {
            showWarningMessageStub.impl = async () => undefined;
            const { checkExecutablePathSafety } = loadMavenUtils();
            const result = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(result, "abort");
        });

        it("returns 'abort' and does NOT cache when user clicks Open Settings", async () => {
            showWarningMessageStub.impl = async () => "Open Settings";
            const { checkExecutablePathSafety } = loadMavenUtils();

            const first = await checkExecutablePathSafety("./fake-mvn");
            assert.equal(first, "abort");

            let promptCount = 0;
            showWarningMessageStub.impl = async () => { promptCount += 1; return "Open Settings"; };
            await checkExecutablePathSafety("./fake-mvn");
            assert.equal(promptCount, 1, "Open Settings must not cache the path");
        });
    });

    describe("absolute paths outside the workspace", () => {
        it("returns 'safe' without prompting", async () => {
            getWorkspaceFolderStub.impl = () => undefined; // not inside any workspace
            let prompted = false;
            showWarningMessageStub.impl = async () => { prompted = true; return "Allow"; };

            const { checkExecutablePathSafety } = loadMavenUtils();
            // Use a system path that realpath can resolve to itself (or a missing
            // path — canonicalizePath falls back to the original on error).
            const abs = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/usr/bin/env";
            const result = await checkExecutablePathSafety(abs);

            assert.equal(result, "safe");
            assert.equal(prompted, false, "Absolute paths outside any workspace must not prompt");
        });
    });

    describe("absolute paths inside the workspace", () => {
        it("prompts and returns 'safe' when user clicks Allow; caches by canonical path", async () => {
            // Pretend every absolute path resolves inside a workspace folder.
            getWorkspaceFolderStub.impl = () => ({ uri: { fsPath: "/ws" }, name: "ws", index: 0 });
            let promptCount = 0;
            showWarningMessageStub.impl = async () => { promptCount += 1; return "Allow"; };

            const { checkExecutablePathSafety } = loadMavenUtils();
            const abs = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/usr/bin/env";

            const first = await checkExecutablePathSafety(abs);
            assert.equal(first, "safe");
            assert.equal(promptCount, 1);

            const second = await checkExecutablePathSafety(abs);
            assert.equal(second, "safe");
            assert.equal(promptCount, 1, "Allow should cache the canonical path");
        });

        it("returns 'use-default' and does NOT cache when user clicks Use Default Maven", async () => {
            getWorkspaceFolderStub.impl = () => ({ uri: { fsPath: "/ws" }, name: "ws", index: 0 });
            let promptCount = 0;
            showWarningMessageStub.impl = async () => { promptCount += 1; return "Use Default Maven"; };

            const { checkExecutablePathSafety } = loadMavenUtils();
            const abs = process.platform === "win32" ? "C:\\Windows\\System32\\cmd.exe" : "/usr/bin/env";

            await checkExecutablePathSafety(abs);
            await checkExecutablePathSafety(abs);
            assert.equal(promptCount, 2, "Use Default must not be cached");
        });
    });
});
