// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface ArchetypeGenerateMetadata {
    archetypeArtifactId: string;
    archetypeGroupId: string;
    archetypeVersion: string;
    groupId: string;
    artifactId: string;
    outputDirectory?: string;
}

export function buildArchetypeGenerateArgs(metadata: ArchetypeGenerateMetadata): string[] {
    return [
        // explicitly using 3.1.2 as maven-archetype-plugin:3.0.1 ignores -DoutputDirectory
        // see https://github.com/microsoft/vscode-maven/issues/478
        "org.apache.maven.plugins:maven-archetype-plugin:3.1.2:generate",
        `-DarchetypeArtifactId=${metadata.archetypeArtifactId}`,
        `-DarchetypeGroupId=${metadata.archetypeGroupId}`,
        `-DarchetypeVersion=${metadata.archetypeVersion}`,
        `-DgroupId=${metadata.groupId}`,
        `-DartifactId=${metadata.artifactId}`,
        metadata.outputDirectory && `-DoutputDirectory=${metadata.outputDirectory}`
    ].filter((arg): arg is string => !!arg);
}

export function splitMavenExecutableOptions(options: string | undefined): string[] {
    if (!options) {
        return [];
    }

    const args: string[] = [];
    let current = "";
    let quote: string | undefined;
    let tokenStarted = false;
    const trimmed = options.trim();
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];

        if (ch === "\\") {
            let backslashEnd = i;
            while (trimmed[backslashEnd] === "\\") {
                backslashEnd++;
            }
            const backslashCount = backslashEnd - i;
            const next = trimmed[backslashEnd];
            if ((next === "\"" || next === "'") && (!quote || next === quote)) {
                current += "\\".repeat(Math.floor(backslashCount / 2));
                tokenStarted = true;
                if (backslashCount % 2 === 1) {
                    current += next;
                    i = backslashEnd;
                } else {
                    i = backslashEnd - 1;
                }
            } else {
                current += "\\".repeat(backslashCount);
                tokenStarted = true;
                i = backslashEnd - 1;
            }
            continue;
        }

        if (quote) {
            if (ch === quote) {
                quote = undefined;
            } else {
                current += ch;
            }
            continue;
        }

        if (ch === "\"" || ch === "'") {
            quote = ch;
            tokenStarted = true;
            continue;
        }

        if (/\s/.test(ch)) {
            if (tokenStarted) {
                args.push(current);
                current = "";
                tokenStarted = false;
            }
            continue;
        }

        current += ch;
        tokenStarted = true;
    }

    if (tokenStarted) {
        args.push(current);
    }
    return args;
}

export function getMavenExecutableOptionArgs(options: string | string[] | undefined): string[] {
    return Array.isArray(options) ? options : splitMavenExecutableOptions(options);
}
