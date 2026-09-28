// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import proxyquire = require("proxyquire");
import type { EffectivePomOptions, MavenExecutionGuard } from "../../src/utils/mavenUtils";

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function fixture() {
    const calls: { pomPath: string; options?: EffectivePomOptions; result: ReturnType<typeof deferred<string | undefined>> }[] = [];
    const { EffectivePomProvider }: typeof import("../../src/explorer/EffectivePomProvider") = proxyquire.noCallThru().noPreserveCache()(
        "../../src/explorer/EffectivePomProvider", {
            "../utils/mavenUtils": {
                rawEffectivePom: async (pomPath: string, options?: EffectivePomOptions): Promise<string | undefined> => {
                    const result = deferred<string | undefined>();
                    calls.push({ pomPath, options, result });
                    if (!options?.cacheOnly) {
                        await options?.beforeExecute?.();
                    }
                    return result.promise;
                }
            },
            "../utils/Utils": { Utils: { parseXmlContent: async (content: string) => ({ content }) } }
        });
    return { calls, provider: new EffectivePomProvider("original-pom.xml") };
}

const nextTurn = () => new Promise<void>(resolve => setImmediate(resolve));

describe("EffectivePomProvider guarded calculations", () => {
    for (const guarded of [false, true]) {
        it(`shares matching in-flight calculations, guarded=${guarded}`, async () => {
            const h = fixture();
            let guardCalls = 0;
            const beforeExecute = guarded ? async () => { guardCalls++; } : undefined;
            const first = h.provider.getEffectivePom({ beforeExecute });
            const second = h.provider.getEffectivePom({ beforeExecute, cacheOnly: false });
            assert.equal(h.calls.length, 1);
            h.calls[0].result.resolve("shared");
            const results = await Promise.all([first, second]);
            assert.equal(results[0], results[1]);
            assert.equal(results[0]?.pomPath, "original-pom.xml");
            assert.equal(guardCalls, guarded ? 1 : 0);
        });
    }

    for (const order of ["guarded-first", "unguarded-first", "different-guards"] as const) {
        it(`serializes incompatible calculations: ${order}`, async () => {
            const h = fixture();
            const guards: string[] = [];
            const firstGuard: MavenExecutionGuard | undefined = order === "unguarded-first"
                ? undefined : async () => { guards.push("first"); };
            const secondGuard: MavenExecutionGuard | undefined = order === "guarded-first"
                ? undefined : async () => { guards.push("second"); };
            const first = h.provider.getEffectivePom({ beforeExecute: firstGuard });
            const second = h.provider.getEffectivePom({ beforeExecute: secondGuard });
            assert.equal(h.calls.length, 1);
            h.calls[0].result.resolve("first result");
            assert.equal((await first)?.ePomString, "first result");
            await nextTurn();
            assert.equal(h.calls.length, 2);
            assert.equal(h.calls[1].options?.beforeExecute, secondGuard);
            h.calls[1].result.resolve("second result");
            assert.equal((await second)?.ePomString, "second result");
            assert.deepEqual(guards, order === "guarded-first" ? ["first"] : order === "unguarded-first" ? ["second"] : ["first", "second"]);
        });
    }

    for (const cacheOnlyFirst of [false, true]) {
        it(`does not coalesce cacheOnly with generating requests, cacheOnlyFirst=${cacheOnlyFirst}`, async () => {
            const h = fixture();
            let guardCalls = 0;
            const beforeExecute = async () => { guardCalls++; };
            const first = h.provider.getEffectivePom({ cacheOnly: cacheOnlyFirst, beforeExecute });
            const second = h.provider.getEffectivePom({ cacheOnly: !cacheOnlyFirst, beforeExecute });
            h.calls[0].result.resolve("first");
            await first;
            await nextTurn();
            assert.equal(h.calls.length, 2);
            assert.equal(h.calls[1].options?.cacheOnly, !cacheOnlyFirst);
            h.calls[1].result.resolve("second");
            await second;
            assert.equal(guardCalls, 1);
        });
    }

    it("surfaces a failed calculation to its own callers and still runs an incompatible queued request", async () => {
        const h = fixture();
        const first = h.provider.getEffectivePom();
        const firstRejection = assert.rejects(first, /first failure/);
        let guardCalls = 0;
        const second = h.provider.getEffectivePom({ beforeExecute: async () => { guardCalls++; } });
        h.calls[0].result.reject(new Error("first failure"));
        await firstRejection;
        await nextTurn();
        assert.equal(h.calls.length, 2);
        h.calls[1].result.resolve("second");
        assert.equal((await second)?.ePomString, "second");
        assert.equal(guardCalls, 1);
    });

    it("rechecks each queued guard and surfaces a failed guard", async () => {
        const h = fixture();
        const first = h.provider.getEffectivePom();
        const second = h.provider.getEffectivePom({ beforeExecute: async () => { throw new Error("POM changed"); } });
        const rejection = assert.rejects(second, /POM changed/);
        h.calls[0].result.resolve("first");
        await first;
        await rejection;
        assert.equal(h.calls.length, 2);
    });

    it("propagates refresh errors and allows a later calculation", async () => {
        const h = fixture();
        const refresh = h.provider.calculateEffectivePom();
        const rejection = assert.rejects(refresh, /refresh failed/);
        h.calls[0].result.reject(new Error("refresh failed"));
        await rejection;
        const next = h.provider.getEffectivePom();
        assert.equal(h.calls.length, 2);
        h.calls[1].result.resolve(undefined);
        assert.equal(await next, undefined);
    });
});
