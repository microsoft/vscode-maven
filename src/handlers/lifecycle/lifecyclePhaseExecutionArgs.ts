// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DEFAULT_MAVEN_LIFECYCLES } from "../../completion/constants";

export interface LifecyclePhaseExecutionArgs {
    phase: string;
    pomPath: string;
}

export interface LifecyclePhaseExecutionOptions {
    command: string;
    pomfile: string;
}

export function resolveLifecyclePhaseExecutionOptions(value: unknown): LifecyclePhaseExecutionOptions {
    const args = normalizeLifecyclePhaseExecutionArgs(value);
    if (!args) {
        throw new Error("Invalid Maven lifecycle phase command arguments.");
    }

    if (!DEFAULT_MAVEN_LIFECYCLES.includes(args.phase)) {
        throw new Error(`Unsupported Maven lifecycle phase: ${args.phase}`);
    }

    return { command: args.phase, pomfile: args.pomPath };
}

export function normalizeLifecyclePhaseExecutionArgs(value: unknown): LifecyclePhaseExecutionArgs | undefined {
    if (!isRecord(value)) {
        return undefined;
    }

    const { phase, pomPath } = value;
    if (typeof phase === "string" && typeof pomPath === "string") {
        return { phase, pomPath };
    }

    const { project } = value;
    if (typeof phase === "string" && isRecord(project) && typeof project.pomPath === "string") {
        return { phase, pomPath: project.pomPath };
    }

    return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
