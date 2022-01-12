// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { SelectArchetypeStep } from "./SelectArchetypeStep";
import { SpecifyArchetypeVersionStep } from "./SpecifyArchetypeVersionStep";
import { SpecifyArtifactIdStep } from "./SpecifyArtifactIdStep";
import { SpecifyGroupIdStep } from "./SpecifyGroupIdStep";
import { SpecifyTargetFolderStep } from "./SpecifyTargetFolderStep";
import { IProjectCreationMetadata, IProjectCreationStep, StepResult } from "./types";

export const selectArchetypeStep = new SelectArchetypeStep();
export const specifyArchetypeVersionStep = new SpecifyArchetypeVersionStep();
export const specifyGroupIdStep = new SpecifyGroupIdStep();
export const specifyArtifactIdStep = new SpecifyArtifactIdStep();
export const specifyTargetFolderStep = new SpecifyTargetFolderStep();

/**
 * Run a group of steps to create a Maven project.
 * @param steps array of IProjectCreationStep to run
 * @param metadata stores data across steps
 * @returns whether all steps are successfully passed
 */
export const runSteps = async (steps: IProjectCreationStep[], metadata: IProjectCreationMetadata): Promise<boolean> => {
  for (let i = 0; i < steps.length; i += 1) {
    steps[i].nextStep = steps[i + 1];
    steps[i].previousStep = steps[i - 1];
  }
  let step: IProjectCreationStep | undefined = steps[0];
  while (step !== undefined) {
    const result = await step.run(metadata);
    switch (result) {
      case StepResult.NEXT:
        step = step.nextStep;
        break;
      case StepResult.PREVIOUS:
        step = step.previousStep;
        break;
      case StepResult.STOP:
        return false; // user cancellation
      default:
        throw new Error("invalid StepResult returned.");
    }
  }
  return true;
};
