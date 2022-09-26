// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { readFileSync } from "fs";
import { getPathToExtensionRoot } from "../../utils/contextUtils";

/**
 * Key: `gid:aid`
 * Value: usage as integer
 */
let dict: Map<string, number>;

export function getUsage(artifactId: string): number {
    if (dict === undefined) {
        initialize();
    }

    return dict.get(artifactId) ?? 0;
}

function initialize() {
    const usageFilePath = getPathToExtensionRoot("resources", "IndexData", "ArtifactUsage.json");
    let raw;
    try {
        raw = JSON.parse(readFileSync(usageFilePath).toString())
    } catch (error) {
        console.warn("Failed to load data from ArtifactUsage.json");
    }

    if (raw) {
        dict = new Map();
        for (const id of Object.keys(raw)) {
            dict.set(id, raw[id]);
        }
    }
}
