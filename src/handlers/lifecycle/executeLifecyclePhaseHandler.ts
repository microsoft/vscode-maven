// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { executeInTerminal } from "../../utils/mavenUtils";
import { resolveLifecyclePhaseExecutionOptions } from "./lifecyclePhaseExecutionArgs";

export async function executeLifecyclePhaseHandler(node: unknown): Promise<void> {
    await executeInTerminal(resolveLifecyclePhaseExecutionOptions(node));
}
