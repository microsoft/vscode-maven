// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Unit tests for the pom IntelliSense network hardening introduced by PR #1170
 * (fix for issue #1127). Exercises `getArtifacts` / `getVersions` in isolation
 * by stubbing the `https` module with a controllable fake, so we can drive
 * `data` / `end` / `error` / `timeout` events deterministically and assert the
 * timeout, CancellationToken, and console.error suppression behavior.
 */

import { strict as assert } from "assert";
import { EventEmitter } from "events";

// proxyquire's default export is a callable function with helper methods.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const proxyquire: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request: string, stubs: Record<string, any>): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noPreserveCache: () => (request: string, stubs: Record<string, any>) => any;
} = require("proxyquire");

interface FakeRequest extends EventEmitter {
    destroyed: boolean;
    destroyError?: Error;
    destroy: (err?: Error) => void;
}

interface HttpsCall {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    req: FakeRequest;
    res: EventEmitter;
    responseCallback: (res: EventEmitter) => void;
}

interface FakeHttps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    httpsStub: Record<string, any>;
    calls: HttpsCall[];
}

function makeFakeHttps(): FakeHttps {
    const calls: HttpsCall[] = [];
    const get = (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        options: any,
        responseCallback: (res: EventEmitter) => void
    ): FakeRequest => {
        const req = new EventEmitter() as FakeRequest;
        req.destroyed = false;
        req.destroy = (err?: Error) => {
            req.destroyed = true;
            req.destroyError = err;
            if (err) {
                // Real Node emits 'error' asynchronously after destroy(err).
                process.nextTick(() => req.emit("error", err));
            }
        };
        const res = new EventEmitter();
        calls.push({ options, req, res, responseCallback });
        return req;
    };
    return {
        calls,
        httpsStub: { get, "@noCallThru": true }
    };
}

interface FakeToken {
    isCancellationRequested: boolean;
    onCancellationRequested: (listener: () => void) => { dispose: () => void };
    _cancel(): void;
}

function makeFakeToken(initiallyCancelled = false): FakeToken {
    const listeners: Array<() => void> = [];
    const tok: FakeToken = {
        isCancellationRequested: initiallyCancelled,
        onCancellationRequested: (listener: () => void) => {
            listeners.push(listener);
            return {
                dispose: () => {
                    const i = listeners.indexOf(listener);
                    if (i >= 0) {
                        listeners.splice(i, 1);
                    }
                }
            };
        },
        _cancel: () => {
            tok.isCancellationRequested = true;
            for (const l of [...listeners]) {
                l();
            }
        }
    };
    return tok;
}

interface RequestUtilsModule {
    getArtifacts: (keywords: string[], token?: FakeToken) => Promise<Array<{ a: string }>>;
    getVersions: (gid: string, aid: string, token?: FakeToken) => Promise<Array<{ v: string }>>;
}

function load(): { mod: RequestUtilsModule; calls: HttpsCall[] } {
    const { httpsStub, calls } = makeFakeHttps();
    const pq = proxyquire.noPreserveCache();
    const mod = pq("../../src/utils/requestUtils", {
        "https": httpsStub,
        // requestUtils only imports `vscode` for the CancellationToken type;
        // an empty stub is enough to satisfy the require() at runtime.
        "vscode": { "@noCallThru": true }
    }) as RequestUtilsModule;
    return { mod, calls };
}

// Yield one macrotask so that the fake https.get gets invoked.
async function flushMicrotasks(): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
}

describe("requestUtils — PR #1170", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let consoleErrorCalls: any[][];
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
        consoleErrorCalls = [];
        originalConsoleError = console.error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error = (...args: any[]) => { consoleErrorCalls.push(args); };
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    describe("getArtifacts", () => {
        it("returns [] without making an HTTPS call when all keywords are too short (< 3 chars)", async () => {
            const { mod, calls } = load();
            const result = await mod.getArtifacts(["a", "ab"]);
            assert.deepEqual(result, []);
            assert.equal(calls.length, 0);
            assert.equal(consoleErrorCalls.length, 0);
        });

        it("returns parsed docs on a successful response", async () => {
            const { mod, calls } = load();
            const promise = mod.getArtifacts(["junit"]);

            await flushMicrotasks();
            assert.equal(calls.length, 1);
            const { res, responseCallback } = calls[0];
            responseCallback(res);
            res.emit("data", Buffer.from(JSON.stringify({
                response: {
                    docs: [{ id: "junit:junit", g: "junit", a: "junit", latestVersion: "4.13.2", versionCount: 60, p: "jar" }]
                }
            })));
            res.emit("end");

            const result = await promise;
            assert.equal(result.length, 1);
            assert.equal(result[0].a, "junit");
            assert.equal(consoleErrorCalls.length, 0);
        });

        it("passes a 10s timeout to https.get", async () => {
            const { mod, calls } = load();
            const promise = mod.getArtifacts(["junit"]);

            await flushMicrotasks();
            assert.equal(calls.length, 1);
            assert.equal(calls[0].options.timeout, 10_000);

            // Tidy up so the test doesn't leave a pending promise.
            const { res, responseCallback } = calls[0];
            responseCallback(res);
            res.emit("data", Buffer.from(JSON.stringify({ response: { docs: [] } })));
            res.emit("end");
            await promise;
        });

        it("returns [] without console.error when token is already cancelled (pre-flight short-circuit)", async () => {
            const { mod, calls } = load();
            const token = makeFakeToken(true);

            const result = await mod.getArtifacts(["junit"], token);

            assert.deepEqual(result, []);
            assert.equal(calls.length, 0, "httpsGet must short-circuit before calling https.get");
            assert.equal(consoleErrorCalls.length, 0, "Pre-cancelled token must not log");
        });

        it("returns [] without console.error when token is cancelled mid-flight; req is destroyed", async () => {
            const { mod, calls } = load();
            const token = makeFakeToken();
            const promise = mod.getArtifacts(["junit"], token);

            await flushMicrotasks();
            assert.equal(calls.length, 1);

            token._cancel();
            const result = await promise;

            assert.deepEqual(result, []);
            assert.equal(calls[0].req.destroyed, true, "Cancellation must destroy the in-flight request");
            assert.equal(consoleErrorCalls.length, 0, "Cancellation must not log to console.error");
        });

        it("returns [] AND logs to console.error on a real network error (non-cancellation)", async () => {
            const { mod, calls } = load();
            const promise = mod.getArtifacts(["junit"]);

            await flushMicrotasks();
            calls[0].req.emit("error", new Error("ECONNREFUSED"));

            const result = await promise;
            assert.deepEqual(result, []);
            assert.equal(consoleErrorCalls.length, 1, "Real failures must still be logged");
            assert.ok(String(consoleErrorCalls[0][0]).includes("ECONNREFUSED"));
        });

        it("on 'timeout' destroys the request with a timeout error and returns []", async () => {
            const { mod, calls } = load();
            const promise = mod.getArtifacts(["junit"]);

            await flushMicrotasks();
            const { req } = calls[0];

            // Simulate Node's socket idle timeout — our handler calls req.destroy(err).
            req.emit("timeout");

            const result = await promise;
            assert.deepEqual(result, []);
            assert.equal(req.destroyed, true);
            assert.ok(req.destroyError, "destroy should be called with an error");
            assert.ok(/timed out/.test(req.destroyError!.message), `unexpected error: ${req.destroyError!.message}`);
            assert.equal(consoleErrorCalls.length, 1, "Timeout is a real failure and must be logged");
        });
    });

    describe("getVersions", () => {
        it("returns parsed docs on a successful response", async () => {
            const { mod, calls } = load();
            const promise = mod.getVersions("junit", "junit");

            await flushMicrotasks();
            const { res, responseCallback } = calls[0];
            responseCallback(res);
            res.emit("data", Buffer.from(JSON.stringify({
                response: { docs: [{ id: "junit:junit:4.13.2", g: "junit", a: "junit", v: "4.13.2", timestamp: 0 }] }
            })));
            res.emit("end");

            const result = await promise;
            assert.equal(result.length, 1);
            assert.equal(result[0].v, "4.13.2");
            assert.equal(consoleErrorCalls.length, 0);
        });

        it("returns [] silently when token is cancelled mid-flight", async () => {
            const { mod, calls } = load();
            const token = makeFakeToken();
            const promise = mod.getVersions("junit", "junit", token);

            await flushMicrotasks();
            assert.equal(calls.length, 1);
            token._cancel();

            const result = await promise;
            assert.deepEqual(result, []);
            assert.equal(consoleErrorCalls.length, 0);
        });
    });
});
