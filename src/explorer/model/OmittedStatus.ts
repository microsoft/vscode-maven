// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface IOmittedStatus {
    status: "conflict" | "duplicate" | "normal";
    effectiveVersion: string;
    description?: string;
}
