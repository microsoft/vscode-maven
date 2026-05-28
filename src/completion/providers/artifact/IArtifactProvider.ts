// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CancellationToken, CompletionItem } from "vscode";

export interface IArtifactCompletionProvider {
    getGroupIdCandidates(groupIdHint?: string, artifactIdHint?: string, token?: CancellationToken): Promise<CompletionItem[]>;
    getArtifactIdCandidates(groupIdHint?: string, artifactIdHint?: string, token?: CancellationToken): Promise<CompletionItem[]>;
    getVersionCandidates(groupIdHint?: string, artifactIdHint?: string, versionHint?: string, token?: CancellationToken): Promise<CompletionItem[]>;
}
