// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { IStep } from "./IStep";

class FinishStep implements IStep {
    public async execute(): Promise<IStep | undefined> {
        return undefined;
    }
}

export const finishStep: FinishStep = new FinishStep();
