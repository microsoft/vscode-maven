// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Archetype } from "../Archetype";

export interface IProjectCreationMetadata {
    archetype?: Archetype; // temopary cached data between steps
    archetypeArtifactId?: string;
    archetypeGroupId?: string;
    archetypeVersion?: string;
    groupId?: string;
    artifactId?: string;
    targetFolder?: string;
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
