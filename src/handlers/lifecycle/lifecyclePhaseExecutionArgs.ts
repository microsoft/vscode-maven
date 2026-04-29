// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface LifecyclePhaseExecutionArgs {
    phase: string;
    pomPath: string;
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
