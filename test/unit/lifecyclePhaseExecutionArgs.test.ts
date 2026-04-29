// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import { normalizeLifecyclePhaseExecutionArgs } from "../../src/handlers/lifecycle/lifecyclePhaseExecutionArgs";

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
});
