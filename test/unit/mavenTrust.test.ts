// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import type { SpawnOptions } from "child_process";
import { EventEmitter } from "events";
import * as md5 from "md5";
import * as path from "path";
import proxyquire = require("proxyquire");
import type * as vscode from "vscode";

type MavenUtilsModule = typeof import("../../src/utils/mavenUtils");
type ProviderModule = typeof import("../../src/contentProvider");
type ErrorUtilsModule = typeof import("../../src/utils/errorUtils");
type ProjectModule = typeof import("../../src/explorer/model/MavenProject");
type ProjectManagerModule = typeof import("../../src/project/MavenProjectManager");
type UtilsModule = typeof import("../../src/utils/Utils");
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
        cacheContent: true,
        revokeDuringResolution: false,
        revokeDuringValidation: false,
        revokeDuringFinalValidation: false,
        deferExit: false,
        realpathError: undefined as Error | undefined,
        beforeOperation: undefined as (() => void) | undefined,
        duringResolution: undefined as (() => void) | undefined,
        onSpawn: undefined as (() => void) | undefined
    };
    const roots = [root];
    const canonicalPaths = new Map<string, string>();
    const wrappers = new Set<string>();
    const environments = new Map<string, Record<string, string>>();
    const executableOptions = new Map<string, string[]>();
    const pendingExits: (() => void)[] = [];
    const calls = {
        resolved: 0,
        projects: 0,
        projectPaths: [] as string[],
        spawns: [] as { command: string; args: readonly string[]; options: SpawnOptions }[],
        realpaths: [] as string[],
        stats: [] as string[],
        probes: [] as string[],
        reads: [] as string[],
        writes: [] as string[],
        settings: [] as { name: string; pomPath?: string }[],
        diagnosticPaths: [] as string[],
        repositoryReads: [] as vscode.Uri[]
    };
    const fail = (): never => assert.fail("Unexpected external effect");
    const runHook = (hook: "beforeOperation" | "duringResolution"): void => {
        const callback = state[hook];
        state[hook] = undefined;
        callback?.();
    };
    const fs = {
        realpath: async (filePath: string): Promise<string> => {
            calls.realpaths.push(filePath);
            if (state.realpathError) {
                throw state.realpathError;
            }
            if (state.revokeDuringValidation || (state.revokeDuringFinalValidation && calls.realpaths.length > 2)) {
                state.trusted = false;
            }
            return canonicalPaths.get(filePath) ?? filePath;
        },
        stat: async (filePath: string) => {
            calls.stats.push(filePath);
            return { mtimeMs: 42, isFile: () => state.regularFile };
        },
        pathExists: async (filePath: string): Promise<boolean> => {
            calls.probes.push(filePath);
            if (/mvnw(?:\.cmd)?$/.test(filePath)) {
                runHook("duringResolution");
                return wrappers.has(filePath);
            }
            if (filePath.endsWith(".mtime")) {
                return state.cache !== "cold";
            }
            return filePath.endsWith(".epom") ? state.cacheContent : filePath.endsWith(".deps.txt");
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
        ProgressLocation: { Window: 10, Notification: 15 },
        workspace: {
            get isTrusted(): boolean { return state.trusted; },
            getWorkspaceFolder: (fileUri: vscode.Uri) => {
                const folder = roots.find(candidate =>
                    fileUri.fsPath === candidate || fileUri.fsPath.startsWith(`${candidate}${path.sep}`));
                return folder ? { uri: uri({ path: folder }), name: "workspace", index: roots.indexOf(folder) } : undefined;
            },
            getConfiguration: (_section: string, resource?: vscode.Uri) => {
                calls.settings.push({ name: "configuration", pomPath: resource?.fsPath });
                return { inspect: () => ({}), get: () => undefined };
            },
            fs: {
                readFile: async (fileUri: vscode.Uri): Promise<Buffer> => {
                    calls.repositoryReads.push(fileUri);
                    return Buffer.from("repository content");
                }
            }
        },
        window: {
            withProgress: async (_options: unknown, task: (progress: { report(): void }) => Promise<unknown>) => {
                runHook("beforeOperation");
                return task({ report() {} });
            },
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
                Executable: {
                    optionsValue: (filePath: string) => {
                        calls.settings.push({ name: "options", pomPath: filePath });
                        return executableOptions.get(filePath);
                    },
                    preferMavenWrapper: (filePath: string) => {
                        calls.settings.push({ name: "wrapper", pomPath: filePath });
                        return true;
                    }
                },
                getEnvironment: (filePath: string) => {
                    calls.settings.push({ name: "environment", pomPath: filePath });
                    return environments.get(filePath) ?? {};
                },
                getSettingsFilePath: () => undefined
            }
        },
        "./contextUtils": {
            getPathToWorkspaceStorage: (name: string) => path.join(root, "cache", name),
            getPathToTempFolder: fail
        },
        "../mavenProblemMatcher": {
            mavenProblemMatcher: {
                parseMavenOutput: (_output: string, folder: string) => calls.diagnosticPaths.push(folder)
            }
        },
        "./errorUtils": errors,
        "./historyUtils": { updateLRUCommands: fail },
        "../archetype/archetypeCommand": { getMavenExecutableOptionArgs: (options: string[] | undefined) => options ?? [] },
        "./spawnExecutable": {
            mergeEnvironment: (_parent: NodeJS.ProcessEnv, overrides: NodeJS.ProcessEnv) => overrides,
            resolveExecutablePath: () => {
                calls.resolved++;
                runHook("duringResolution");
                if (state.revokeDuringResolution) {
                    state.trusted = false;
                }
                return "mvn";
            },
            spawnExecutable: (command: string, args: readonly string[], options: SpawnOptions) => {
                calls.spawns.push({ command, args, options });
                const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: null });
                const finish = () => {
                    child.stdout.emit("data", Buffer.from("fixture output"));
                    child.emit("exit", 0, null);
                    child.emit("close");
                };
                if (state.deferExit) {
                    pendingExits.push(finish);
                } else {
                    queueMicrotask(finish);
                }
                state.onSpawn?.();
                return child;
            }
        }
    });
    const utils: UtilsModule = pq("../../src/utils/Utils", {
        "vscode": vscodeMock,
        "fs-extra": fs,
        "vscode-extension-telemetry-wrapper": { setUserError() {} },
        "../completion/constants": {},
        "../explorer/model/FavoriteCommand": {},
        "../explorer/model/LifecyclePhase": {},
        "../explorer/model/MavenProfile": {},
        "../explorer/model/MavenProject": { MavenProject: class {} },
        "../handlers/favorites/runFavoriteCommandsHandler": {},
        "../project/MavenProjectManager": {},
        "./contextUtils": {},
        "./errorUtils": errors,
        "./historyUtils": {},
        "./mavenUtils": maven,
        "./uiUtils": {}
    });
    const effectivePomProvider = pq("../../src/explorer/EffectivePomProvider", {
        "../utils/mavenUtils": maven,
        "../utils/Utils": { Utils: { parseXmlContent: async () => ({ project: {} }) } }
    });
    const projectModule: ProjectModule = pq("../../src/explorer/model/MavenProject", {
        "vscode": vscodeMock,
        "fs": { existsSync: fail, statSync: fail },
        "../../project/MavenProjectManager": {},
        "../../Settings": {},
        "../../utils/contextUtils": {},
        "../../utils/errorUtils": errors,
        "../../utils/mavenUtils": maven,
        "../../utils/Utils": utils,
        "../EffectivePomProvider": effectivePomProvider,
        "../MavenExplorerProvider": {},
        "./DependenciesMenu": {},
        "./Dependency": {},
        "./FavoritesMenu": {},
        "./LifecycleMenu": {},
        "./MavenPlugin": {},
        "./MavenProfile": {},
        "./PluginsMenu": {},
        "./ProfilesMenu": {}
    });
    const { MavenProjectManager }: ProjectManagerModule = pq("../../src/project/MavenProjectManager", {
        "vscode": vscodeMock,
        "../explorer/model/MavenProject": projectModule,
        "../Settings": {}
    });
    const registerProject = (filePath: string) => {
        const project = new projectModule.MavenProject(filePath);
        MavenProjectManager.update(project);
        return project;
    };
    const project = registerProject(pomPath);
    const handler = pq("../../src/handlers/dependency/showDependenciesHandler", {
        "vscode": vscodeMock,
        "vscode-extension-telemetry-wrapper": { setUserError() {} },
        "../../explorer/model/MavenProject": projectModule,
        "../../utils/mavenUtils": maven,
        "../../utils/uiUtils": { dependenciesContentUri: fail }
    });
    const provider: ProviderModule = pq("../../src/contentProvider", {
        "vscode": vscodeMock,
        "fs-extra": fs,
        "./handlers/dependency/showDependenciesHandler": handler,
        "./project/MavenProjectManager": {
            MavenProjectManager: {
                get: (filePath: string) => {
                    calls.projects++;
                    calls.projectPaths.push(filePath);
                    runHook("beforeOperation");
                    return state.knownProject ? MavenProjectManager.get(filePath) : undefined;
                }
            }
        },
        "./utils/errorUtils": errors,
        "./utils/mavenUtils": maven,
        "./utils/Utils": utils
    });
    const open = (authority: string, query = pomPath): Promise<string | undefined> =>
        provider.contentProvider.provideTextDocumentContent(
            uri({ scheme: "vscode-maven", authority, path: path.join(root, "display"), query }), token);
    const finishNextSpawn = () => {
        const finish = pendingExits.shift();
        assert.ok(finish, "Expected a pending fixture process");
        finish();
    };
    return {
        root, pomPath, roots, state, canonicalPaths, wrappers, environments, executableOptions,
        calls, errors, maven, provider, project, registerProject, open, finishNextSpawn
    };
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

describe("Maven document launch revalidation", () => {
    const routes = [
        { authority: "dependencies", knownProject: false },
        { authority: "effective-pom", knownProject: false },
        { authority: "effective-pom", knownProject: true }
    ];

    for (const { authority, knownProject } of routes) {
        const route = `${authority}, known=${knownProject}`;

        for (const hook of ["beforeOperation", "duringResolution"] as const) {
            it(`rejects an in-workspace alias retarget ${hook} for ${route}`, async () => {
                const h = fixture();
                h.state.knownProject = knownProject;
                h.state[hook] = () => h.canonicalPaths.set(h.pomPath, path.join(h.root, "other", "pom.xml"));
                await assert.rejects(h.open(authority), (error: unknown) =>
                    error instanceof h.errors.UserError && /changed.*Reopen/.test(error.message));
                assert.equal(h.calls.spawns.length, 0);
                assert.equal(h.calls.writes.length, 0);
            });
        }

        for (const mutation of ["escape", "directory", "missing", "root", "removed-workspace"] as const) {
            it(`rejects ${mutation} during executable resolution for ${route}`, async () => {
                const h = fixture();
                h.state.knownProject = knownProject;
                h.state.duringResolution = () => {
                    switch (mutation) {
                        case "escape":
                            h.canonicalPaths.set(h.pomPath, path.join(`${h.root}-other`, "pom.xml"));
                            break;
                        case "directory":
                            h.state.regularFile = false;
                            break;
                        case "missing":
                            h.state.realpathError = Object.assign(new Error("POM not found"), { code: "ENOENT" });
                            break;
                        case "root":
                            h.canonicalPaths.set(h.root, path.dirname(h.root));
                            break;
                        case "removed-workspace":
                            h.roots.length = 0;
                            break;
                    }
                };
                await assert.rejects(h.open(authority));
                assert.equal(h.calls.spawns.length, 0);
                assert.equal(h.calls.writes.length, 0);
            });
        }

        it(`rejects a workspace junction moved with its POM for ${route}`, async () => {
            const h = fixture();
            h.state.knownProject = knownProject;
            h.state.duringResolution = () => {
                const movedRoot = path.resolve("moved-workspace");
                h.canonicalPaths.set(h.root, movedRoot);
                h.canonicalPaths.set(h.pomPath, path.join(movedRoot, "project with spaces", "pom.xml"));
            };
            await assert.rejects(h.open(authority), /workspace folder changed/);
            assert.equal(h.calls.spawns.length, 0);
        });

        it(`rechecks trust after the asynchronous final validation for ${route}`, async () => {
            const h = fixture();
            h.state.knownProject = knownProject;
            h.state.revokeDuringFinalValidation = true;
            await assert.rejects(h.open(authority), /requires a trusted workspace/);
            assert.equal(h.calls.spawns.length, 0);
        });

        it(`preserves original multi-root alias, settings, wrapper, cwd and cache identity for ${route}`, async () => {
            const h = fixture();
            h.state.knownProject = knownProject;
            const secondRoot = path.resolve("second workspace \u9879\u76ee");
            const canonicalRoot = path.resolve("physical workspace");
            const pomPath = path.join(secondRoot, "module & 100%", "pom.xml");
            const canonicalPom = path.join(canonicalRoot, "module & 100%", "pom.xml");
            const wrapper = path.join(secondRoot, process.platform === "win32" ? "mvnw.cmd" : "mvnw");
            h.roots.push(secondRoot);
            h.registerProject(pomPath);
            h.canonicalPaths.set(secondRoot, canonicalRoot);
            h.canonicalPaths.set(pomPath, canonicalPom);
            h.wrappers.add(wrapper);
            h.environments.set(pomPath, { FIXTURE_ROOT: "second" });
            h.executableOptions.set(pomPath, ["-Dfixture=second"]);
            h.environments.set(h.pomPath, { FIXTURE_ROOT: "first" });

            assert.equal(await h.open(authority, pomPath), "generated content");
            assert.equal(h.calls.spawns.length, 1);
            const launch = h.calls.spawns[0];
            assert.equal(launch.command, wrapper);
            assert.equal(launch.options.cwd, secondRoot);
            assert.deepEqual(launch.options.env, { FIXTURE_ROOT: "second" });
            assert.deepEqual(launch.args.slice(-3), ["-Dfixture=second", "-f", pomPath]);
            assert.ok(h.calls.settings.length >= 4);
            assert.ok(h.calls.settings.every(call => call.pomPath === pomPath));
            assert.deepEqual(h.calls.diagnosticPaths, [path.dirname(pomPath)]);
            assert.deepEqual(h.calls.realpaths, [pomPath, secondRoot, pomPath, secondRoot]);
            const output = path.join(h.root, "cache", md5(pomPath));
            assert.ok(h.calls.reads.includes(`${output}${authority === "dependencies" ? ".deps.txt" : ".epom"}`));
            if (authority === "effective-pom") {
                assert.deepEqual(h.calls.projectPaths, [pomPath]);
                assert.deepEqual(h.calls.writes, [`${output}.mtime`]);
            }
        });

        it(`preserves original -f for a POM linked to another directory for ${route}`, async () => {
            const h = fixture();
            h.state.knownProject = knownProject;
            const target = path.join(h.root, "other directory", "pom.xml");
            h.canonicalPaths.set(h.pomPath, target);
            assert.equal(await h.open(authority), "generated content");
            assert.deepEqual(h.calls.spawns[0].args.slice(-2), ["-f", h.pomPath]);
            assert.equal(h.calls.spawns[0].options.cwd, h.root);
            assert.equal(h.calls.realpaths.filter(filePath => filePath === h.pomPath).length, 2);
        });
    }

    for (const knownProject of [false, true]) {
        it(`does not resolve an executable or run the launch recheck for a warm effective POM, known=${knownProject}`, async () => {
            const h = fixture();
            Object.assign(h.state, { knownProject, cache: "warm" });
            h.state.beforeOperation = () => h.canonicalPaths.set(h.pomPath, path.join(h.root, "other", "pom.xml"));
            assert.equal(await h.open("effective-pom"), "generated content");
            assert.equal(h.calls.realpaths.length, 2);
            assert.equal(h.calls.resolved, 0);
            assert.equal(h.calls.spawns.length, 0);
        });
    }

    for (const guardedFirst of [false, true]) {
        it(`does not reuse in-flight effective-POM work with a different guard, guardedFirst=${guardedFirst}`, async () => {
            const h = fixture();
            Object.assign(h.state, { knownProject: true, deferExit: true });
            const spawned = new Promise<void>(resolve => { h.state.onSpawn = resolve; });
            const first = guardedFirst ? h.open("effective-pom") : h.project.getEffectivePom();
            await spawned;
            const started = new Promise<void>(resolve => { h.state.beforeOperation = resolve; });
            const second = h.open("effective-pom");
            const rejection = assert.rejects(second, /changed.*Reopen/);
            await started;
            h.state.duringResolution = () => h.canonicalPaths.set(h.pomPath, path.join(h.root, "other", "pom.xml"));
            h.finishNextSpawn();
            await first;
            await rejection;
            assert.equal(h.calls.spawns.length, 1, "The separately guarded request must not launch");
        });
    }
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

    it("checks trust again after an asynchronous launch guard", async () => {
        const h = fixture();
        await assert.rejects(h.maven.rawDependencyTree(h.pomPath, async () => {
            assert.equal(h.calls.resolved, 1);
            await Promise.resolve();
            h.state.trusted = false;
        }), /requires a trusted workspace/);
        assert.equal(h.calls.spawns.length, 0);
    });

    it("keeps raw callers without a guard free of provider path restrictions", async () => {
        const h = fixture();
        const outside = path.join(`${h.root}-other`, "pom.xml");
        assert.equal(await h.maven.rawDependencyTree(outside), "generated content");
        assert.equal(h.calls.realpaths.length, 0);
        assert.deepEqual(h.calls.spawns[0].args.slice(-2), ["-f", outside]);
        assert.equal(h.calls.spawns[0].options.cwd, path.dirname(outside));
    });

    it("skips launch guards for warm and cacheOnly effective-POM reads, including a cache miss", async () => {
        const h = fixture();
        const beforeExecute = async (): Promise<void> => assert.fail("Read-only cache access must not run a launch guard");
        Object.assign(h.state, { trusted: false, cache: "warm" });
        assert.equal(await h.maven.rawEffectivePom(h.pomPath, { beforeExecute }), "generated content");
        h.state.cache = "stale";
        assert.equal((await h.project.getEffectivePom({ cacheOnly: true, beforeExecute }))?.ePomString, "generated content");
        h.state.cacheContent = false;
        assert.equal(await h.project.getEffectivePom({ cacheOnly: true, beforeExecute }), undefined);
        assert.equal(h.calls.realpaths.length, 0);
        assert.equal(h.calls.spawns.length, 0);
    });
});
