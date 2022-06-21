// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { extensions } from "vscode";

export async function ensureExtensionActivated() {
    await extensions.getExtension("redhat.java")!.activate();
    await extensions.getExtension("vscjava.vscode-maven")!.activate();
}
