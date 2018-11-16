// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { setUserError } from "vscode-extension-telemetry-wrapper";

// tslint:disable-next-line:export-name
export class OperationCanceledError extends Error {
    constructor(msg?: string) {
        super(msg);
        setUserError(this);
    }
}
