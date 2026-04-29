// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import {
    normalizeLifecyclePhaseExecutionArgs,
    resolveLifecyclePhaseExecutionOptions
} from "../../src/handlers/lifecycle/lifecyclePhaseExecutionArgs";

describe("normalizeLifecyclePhaseExecutionArgs", () => {
    it("accepts a stable command payload", () => {
        assert.deepEqual(
            normalizeLifecyclePhaseExecutionArgs({ phase: "compile", pomPath: "C:\\workspace\\pom.xml" }),
            { phase: "compile", pomPath: "C:\\workspace\\pom.xml" }
        );
    });

    it("accepts a Maven Explorer lifecycle tree element shape", () => {
        assert.deepEqual(
            normalizeLifecyclePhaseExecutionArgs({ phase: "test", project: { pomPath: "C:\\workspace\\pom.xml" } }),
            { phase: "test", pomPath: "C:\\workspace\\pom.xml" }
        );
    });

    it("rejects invalid payloads", () => {
        assert.equal(normalizeLifecyclePhaseExecutionArgs(undefined), undefined);
        assert.equal(normalizeLifecyclePhaseExecutionArgs({ phase: "compile" }), undefined);
        assert.equal(normalizeLifecyclePhaseExecutionArgs({ pomPath: "C:\\workspace\\pom.xml" }), undefined);
        assert.equal(normalizeLifecyclePhaseExecutionArgs({ phase: "compile", project: {} }), undefined);
    });

    it("resolves executable Maven options for valid lifecycle phases", () => {
        assert.deepEqual(
            resolveLifecyclePhaseExecutionOptions({ phase: "compile", pomPath: "C:\\workspace\\pom.xml" }),
            { command: "compile", pomfile: "C:\\workspace\\pom.xml" }
        );
    });

    it("rejects unsupported lifecycle phases", () => {
        assert.throws(
            () => resolveLifecyclePhaseExecutionOptions({ phase: "dependency:tree", pomPath: "C:\\workspace\\pom.xml" }),
            /Unsupported Maven lifecycle phase/
        );
    });

    it("rejects invalid execution arguments", () => {
        assert.throws(
            () => resolveLifecyclePhaseExecutionOptions({ phase: "compile" }),
            /Invalid Maven lifecycle phase command arguments/
        );
    });
});
