// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ArchetypeMetadata } from "./ArchetypeModule";

export interface IStep {
    execute(archetypeMetadata?: ArchetypeMetadata): Promise<IStep | undefined>;
}
