// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

export function isXmlExtensionEnabled() {
    const XML_EXTENSION_ID = "redhat.vscode-xml";
    const xmlExtension = vscode.extensions.getExtension(XML_EXTENSION_ID);
    return xmlExtension !== undefined;
}