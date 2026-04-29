// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { DEFAULT_MAVEN_LIFECYCLES } from "../../completion/constants";
import { executeInTerminal } from "../../utils/mavenUtils";
import { normalizeLifecyclePhaseExecutionArgs } from "./lifecyclePhaseExecutionArgs";

export async function executeLifecyclePhaseHandler(node: unknown): Promise<void> {
    const args = normalizeLifecyclePhaseExecutionArgs(node);
    if (!args) {
        throw new Error("Invalid Maven lifecycle phase command arguments.");
    }

    if (!DEFAULT_MAVEN_LIFECYCLES.includes(args.phase)) {
        throw new Error(`Unsupported Maven lifecycle phase: ${args.phase}`);
    }

    await executeInTerminal({ command: args.phase, pomfile: args.pomPath });
}
