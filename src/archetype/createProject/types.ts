// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Archetype } from "../Archetype";

export interface IProjectCreationMetadata {
    archetype?: Archetype; // temporary cached data between steps, used to select versions
    archetypeArtifactId?: string;
    archetypeGroupId?: string;
    archetypeVersion?: string;
    groupId?: string;
    artifactId?: string;
    targetFolder?: string;
    // fields for default values in quickbox
    defaultGroupId?: string;
    defaultArtifactId?: string;
    defaultTargetFolder?: string;
}

export interface IProjectCreationStep {
    /**
     * Specify previous step, `undefined` indicates this is the first step.
     */
    previousStep?: IProjectCreationStep;

    /**
     * Specify next step, `undefined` indicates this is the final step.
     */
    nextStep?: IProjectCreationStep;

    /**
     * Task to run in current step.
     * @param metadata stores metadata across all steps.
     */
    run(metadata: IProjectCreationMetadata): Promise<StepResult>;
}

/**
 * Indicates which step to go after running task in current step.
 */
export enum StepResult {
    NEXT,
    STOP,
    PREVIOUS
}
