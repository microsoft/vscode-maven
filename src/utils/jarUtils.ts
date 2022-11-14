// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri, workspace } from "vscode";
import * as jszip from "jszip";

export async function readContentFromJar(jarUri: Uri, ...pathSegs: string[]): Promise<string | undefined> {
    const data = await  workspace.fs.readFile(jarUri);
    const zipData = await jszip.loadAsync(data);
    const zipObj = zipData.file(pathSegs.join("/"));
    return zipObj?.async("text");
}
