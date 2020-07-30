// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ArchetypeMetadata, GenerateStep } from "./ArchetypeModule";

export interface IArchetypeGenerateExecutor {
    execute(archetypeMetadata: ArchetypeMetadata): Promise<GenerateStep | undefined>;
}
