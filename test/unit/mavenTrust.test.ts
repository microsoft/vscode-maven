// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import { EventEmitter } from "events";
import * as path from "path";
import proxyquire = require("proxyquire");
import type * as vscode from "vscode";

type MavenUtilsModule = typeof import("../../src/utils/mavenUtils");
type ProviderModule = typeof import("../../src/contentProvider");
type ErrorUtilsModule = typeof import("../../src/utils/errorUtils");
type UriParts = Pick<vscode.Uri, "scheme" | "authority" | "path" | "query" | "fragment">;

function uri(parts: Partial<UriParts>): vscode.Uri {
    const values: UriParts = { scheme: "file", authority: "", path: "", query: "", fragment: "", ...parts };
    return {
        ...values,
        fsPath: values.path,
        with: changes => uri({ ...values, ...changes }),
        toString: () => `${values.scheme}://${values.authority}${values.path}?${values.query}`,
        toJSON: () => values
    };
}

const token: vscode.CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose() {} })
};

function fixture() {
    const root = path.resolve("workspace");
    const pomPath = path.join(root, "project with spaces", "pom.xml");
    const state = {
        trusted: true,
        knownProject: false,
        cache: "cold" as "cold" | "warm" | "stale",
        regularFile: true,
        revokeDuringResolution: false,
        revokeDuringValidation: false,
        realpathError: undefined as Error | undefined
    };
    const roots = [root];
    const canonicalPaths = new Map<string, string>();
    const calls = {
        resolved: 0,
        projects: 0,
        spawns: [] as { command: string; args: readonly string[] }[],
        realpaths: [] as string[],
        probes: [] as string[],
        reads: [] as string[],
        writes: [] as string[],
        repositoryReads: [] as vscode.Uri[]
    };
    const fail = (): never => assert.fail("Unexpected external effect");
    const fs = {
        realpath: async (filePath: string): Promise<string> => {
            calls.realpaths.push(filePath);
            if (state.realpathError) {
                throw state.realpathError;
            }
            if (state.revokeDuringValidation) {
                state.trusted = false;
            }
            return canonicalPaths.get(filePath) ?? filePath;
        },
        stat: async () => ({ mtimeMs: 42, isFile: () => state.regularFile }),
        pathExists: async (filePath: string): Promise<boolean> => {
            calls.probes.push(filePath);
            return filePath.endsWith(".mtime") ? state.cache !== "cold" : /\.(?:epom|deps\.txt)$/.test(filePath);
        },
        readFile: async (filePath: string): Promise<Buffer> => {
            calls.reads.push(filePath);
            return Buffer.from(filePath.endsWith(".mtime")
                ? (state.cache === "warm" ? "42" : "41")
                : "generated content");
        },
        writeFile: async (filePath: string): Promise<void> => {
            calls.writes.push(filePath);
        }
    };
    const vscodeMock = {
        EventEmitter: class {
            public readonly event = () => ({ dispose() {} });
            public fire(): void {}
        },
        Uri: { file: (filePath: string) => uri({ path: filePath }) },
        ProgressLocation: { Window: 10 },
        workspace: {
            get isTrusted(): boolean { return state.trusted; },
            getWorkspaceFolder: (fileUri: vscode.Uri) => {
                const folder = roots.find(candidate =>
                    fileUri.fsPath === candidate || fileUri.fsPath.startsWith(`${candidate}${path.sep}`));
                return folder ? { uri: uri({ path: folder }), name: "workspace", index: roots.indexOf(folder) } : undefined;
            },
            getConfiguration: () => ({ inspect: () => ({}), get: () => undefined }),
            fs: {
                readFile: async (fileUri: vscode.Uri): Promise<Buffer> => {
                    calls.repositoryReads.push(fileUri);
                    return Buffer.from("repository content");
                }
            }
        },
        window: {
            withProgress: async (_options: unknown, task: (progress: { report(): void }) => Promise<unknown>) =>
                task({ report() {} }),
            showWarningMessage: fail
        }
    };
    const pq = proxyquire.noCallThru().noPreserveCache();
    const errors: ErrorUtilsModule = pq("../../src/utils/errorUtils", {
        "vscode-extension-telemetry-wrapper": { setUserError() {} },
        "./mavenUtils": { promptToSettingMavenExecutable: fail },
        "./uiUtils": { showTroubleshootingDialog: fail }
    });
    const maven: MavenUtilsModule = pq("../../src/utils/mavenUtils", {
        "vscode": vscodeMock,
        "fs-extra": fs,
        "../mavenOutputChannel": { mavenOutputChannel: { appendLine() {}, append() {} } },
        "../mavenTerminal": { mavenTerminal: { runInTerminal: fail } },
        "../project/MavenProjectManager": { MavenProjectManager: { get: () => undefined } },
        "../Settings": {
            Settings: {
                Executable: { optionsValue: () => undefined, preferMavenWrapper: () => true },
                getEnvironment: () => ({}),
                getSettingsFilePath: () => undefined
            }
        },
        "./contextUtils": {
            getPathToWorkspaceStorage: (name: string) => path.join(root, "cache", name),
            getPathToTempFolder: fail
        },
        "../mavenProblemMatcher": { mavenProblemMatcher: { parseMavenOutput() {} } },
        "./errorUtils": errors,
        "./historyUtils": { updateLRUCommands: fail },
        "../archetype/archetypeCommand": { getMavenExecutableOptionArgs: () => [] },
        "./spawnExecutable": {
            mergeEnvironment: () => ({}),
            resolveExecutablePath: () => {
                calls.resolved++;
                if (state.revokeDuringResolution) {
                    state.trusted = false;
                }
                return "mvn";
            },
            spawnExecutable: (command: string, args: readonly string[]) => {
                calls.spawns.push({ command, args });
                const child = Object.assign(new EventEmitter(), { stdout: null, stderr: null });
                queueMicrotask(() => child.emit("exit", 0, null));
                return child;
            }
        }
    });
    const handler = pq("../../src/handlers/dependency/showDependenciesHandler", {
        "vscode": vscodeMock,
        "vscode-extension-telemetry-wrapper": { setUserError() {} },
        "../../explorer/model/MavenProject": { MavenProject: class {} },
        "../../utils/mavenUtils": maven,
        "../../utils/uiUtils": { dependenciesContentUri: fail }
    });
    const provider: ProviderModule = pq("../../src/contentProvider", {
        "vscode": vscodeMock,
        "fs-extra": fs,
        "./handlers/dependency/showDependenciesHandler": handler,
        "./project/MavenProjectManager": {
            MavenProjectManager: {
                get: () => {
                    calls.projects++;
                    return state.knownProject
                        ? { getEffectivePom: async () => ({ ePomString: await maven.rawEffectivePom(pomPath) }) }
                        : undefined;
                }
            }
        },
        "./utils/errorUtils": errors,
        "./utils/mavenUtils": maven,
        "./utils/Utils": { Utils: { getEffectivePom: maven.rawEffectivePom } }
    });
    const open = (authority: string, query = pomPath): Promise<string | undefined> =>
        provider.contentProvider.provideTextDocumentContent(
            uri({ scheme: "vscode-maven", authority, path: path.join(root, "display"), query }), token);
    return { root, pomPath, roots, state, canonicalPaths, calls, errors, maven, provider, open };
}

describe("Maven content provider trust", () => {
    for (const authority of ["dependencies", "effective-pom"]) {
        for (const knownProject of [false, true]) {
            for (const cache of ["cold", "warm", "stale"] as const) {
                it(`rejects untrusted ${authority}, known=${knownProject}, cache=${cache} before filesystem or execution`, async () => {
                    const h = fixture();
                    Object.assign(h.state, { trusted: false, knownProject, cache });
                    await assert.rejects(h.open(authority), /requires a trusted workspace/);
                    assert.equal(h.calls.realpaths.length, 0);
                    assert.equal(h.calls.projects, 0);
                    assert.equal(h.calls.resolved, 0);
                    assert.equal(h.calls.spawns.length, 0);
                });
            }
        }

        for (const invalid of ["", "pom.xml", "outside"]) {
            it(`rejects ${authority} with ${invalid || "empty"} query`, async () => {
                const h = fixture();
                const query = invalid === "outside" ? path.join(`${h.root}-other`, "pom.xml") : invalid;
                await assert.rejects(h.open(authority, query), /absolute POM path inside/);
                assert.equal(h.calls.realpaths.length, 0);
                assert.equal(h.calls.spawns.length, 0);
            });
        }

        it(`rejects ${authority} symlink/junction escapes`, async () => {
            const h = fixture();
            h.canonicalPaths.set(h.pomPath, path.join(`${h.root}-other`, "pom.xml"));
            await assert.rejects(h.open(authority), /resolves outside/);
            assert.equal(h.calls.spawns.length, 0);
        });

        it(`rejects ${authority} directories and missing files`, async () => {
            const h = fixture();
            h.state.regularFile = false;
            await assert.rejects(h.open(authority), /not a file/);
            h.state.realpathError = Object.assign(new Error("POM not found"), { code: "ENOENT" });
            await assert.rejects(h.open(authority), /POM not found/);
            assert.equal(h.calls.spawns.length, 0);
        });

        it(`rechecks trust after asynchronous ${authority} validation`, async () => {
            const h = fixture();
            h.state.knownProject = true;
            h.state.cache = "warm";
            h.state.revokeDuringValidation = true;
            await assert.rejects(h.open(authority), /requires a trusted workspace/);
            assert.equal(h.calls.projects, 0);
            assert.equal(h.calls.spawns.length, 0);
        });

        it(`preserves trusted ${authority} with a symlinked workspace root and spaces`, async () => {
            const h = fixture();
            const canonicalRoot = path.resolve("canonical workspace");
            h.canonicalPaths.set(h.root, canonicalRoot);
            h.canonicalPaths.set(h.pomPath, path.join(canonicalRoot, "project with spaces", "pom.xml"));
            assert.equal(await h.open(authority), "generated content");
            assert.equal(h.calls.spawns.length, 1);
            assert.deepEqual(h.calls.spawns[0].args.slice(-2), ["-f", h.pomPath]);
        });

        it(`supports ${authority} in another trusted workspace folder`, async () => {
            const h = fixture();
            const secondRoot = path.resolve("second-workspace");
            h.roots.push(secondRoot);
            const pomPath = path.join(secondRoot, "pom.xml");
            assert.equal(await h.open(authority, pomPath), "generated content");
            assert.deepEqual(h.calls.spawns[0].args.slice(-2), ["-f", pomPath]);
        });

        it(`preserves Unicode and shell punctuation in trusted ${authority} paths`, async () => {
            const h = fixture();
            const pomPath = path.join(h.root, "\u9879\u76ee & 100%", "pom.xml");
            assert.equal(await h.open(authority, pomPath), "generated content");
            assert.deepEqual(h.calls.spawns[0].args.slice(-2), ["-f", pomPath]);
        });
    }

    for (const knownProject of [false, true]) {
        it(`preserves trusted effective-POM cache hits, known=${knownProject}`, async () => {
            const h = fixture();
            Object.assign(h.state, { knownProject, cache: "warm" });
            assert.equal(await h.open("effective-pom"), "generated content");
            assert.equal(h.calls.resolved, 0);
            assert.equal(h.calls.spawns.length, 0);
        });
    }

    it("uses the registered project for trusted effective POMs", async () => {
        const h = fixture();
        h.state.knownProject = true;
        assert.equal(await h.open("effective-pom"), "generated content");
        assert.equal(h.calls.projects, 1);
        assert.equal(h.calls.spawns.length, 1);
    });

    it("preserves read-only local repository documents without trust", async () => {
        const h = fixture();
        h.state.trusted = false;
        assert.equal(await h.open("local-repository", ""), "repository content");
        assert.equal(h.calls.repositoryReads[0].scheme, "file");
        assert.equal(h.calls.repositoryReads[0].authority, "");
        assert.equal(h.calls.realpaths.length, 0);
        assert.equal(h.calls.spawns.length, 0);
    });

    it("keeps unknown authorities non-executing and rejects other schemes", async () => {
        const h = fixture();
        assert.equal(await h.open("unknown"), undefined);
        await assert.rejects(h.provider.contentProvider.provideTextDocumentContent(uri({ scheme: "other" }), token), /Scheme other/);
        assert.equal(h.calls.spawns.length, 0);
    });
});

describe("Maven background execution trust", () => {
    for (const operation of ["rawDependencyTree", "rawEffectivePom", "rawProfileList", "pluginDescription"] as const) {
        it(`rejects direct ${operation} calls before executable resolution`, async () => {
            const h = fixture();
            h.state.trusted = false;
            const request = operation === "pluginDescription"
                ? h.maven.pluginDescription("org.example:plugin", h.pomPath)
                : h.maven[operation](h.pomPath);
            await assert.rejects(request, /requires a trusted workspace/);
            assert.equal(h.calls.resolved, 0);
            assert.equal(h.calls.spawns.length, 0);
            assert.equal(h.calls.probes.some(filePath => /mvnw(?:\.cmd)?$/.test(filePath)), false);
            assert.equal(h.calls.writes.length, 0);
        });
    }

    it("rechecks trust after asynchronous executable resolution", async () => {
        const h = fixture();
        h.state.revokeDuringResolution = true;
        await assert.rejects(h.maven.rawDependencyTree(h.pomPath), /requires a trusted workspace/);
        assert.equal(h.calls.resolved, 1);
        assert.equal(h.calls.spawns.length, 0);
    });

    it("preserves read-only cached effective POM access without trust", async () => {
        const h = fixture();
        h.state.trusted = false;
        h.state.cache = "warm";
        assert.equal(await h.maven.rawEffectivePom(h.pomPath), "generated content");
        h.state.cache = "stale";
        assert.equal(await h.maven.rawEffectivePom(h.pomPath, { cacheOnly: true }), "generated content");
        await assert.rejects(h.maven.rawEffectivePom(h.pomPath), /requires a trusted workspace/);
        assert.equal(h.calls.resolved, 0);
        assert.equal(h.calls.spawns.length, 0);
    });
});
