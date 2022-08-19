// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CompletionItem } from "vscode";

export interface IArtifactCompletionProvider {
    getGroupIdCandidates(groupIdHint?: string, artifactIdHint?: string): Promise<CompletionItem[]>;
    getArtifactIdCandidates(groupIdHint?: string, artifactIdHint?: string): Promise<CompletionItem[]>;
    getVersionCandidates(groupIdHint?: string, artifactIdHint?: string, versionHint?: string): Promise<CompletionItem[]>;
}
