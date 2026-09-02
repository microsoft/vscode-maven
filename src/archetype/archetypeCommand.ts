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

// A backslash before the active quote can be either an escaped quote or a trailing path separator.
// Explore both meanings in the remainder so later arguments cannot accidentally close the current value.
function canBalanceQuotes(value: string, start: number, initialQuote: string | undefined): boolean {
    const memo = new Map<string, boolean>();

    function visit(index: number, quote: string | undefined): boolean {
        const key = `${index}:${quote || ""}`;
        const cached = memo.get(key);
        if (cached !== undefined) {
            return cached;
        }

        if (index >= value.length) {
            return quote === undefined;
        }

        const ch = value[index];
        if (ch === "\\") {
            let backslashEnd = index;
            while (value[backslashEnd] === "\\") {
                backslashEnd++;
            }
            const backslashCount = backslashEnd - index;
            const next = value[backslashEnd];
            if ((next === "\"" || next === "'") && (!quote || next === quote) && backslashCount % 2 === 1) {
                const afterQuote = backslashEnd + 1;
                if (quote) {
                    const result = visit(afterQuote, quote) || visit(afterQuote, undefined);
                    memo.set(key, result);
                    return result;
                }
                const result = visit(afterQuote, undefined);
                memo.set(key, result);
                return result;
            }

            const result = visit(backslashEnd, quote);
            memo.set(key, result);
            return result;
        }

        let nextQuote = quote;
        if (ch === "\"" || ch === "'") {
            if (!quote) {
                nextQuote = ch;
            } else if (ch === quote) {
                nextQuote = undefined;
            }
        }
        const result = visit(index + 1, nextQuote);
        memo.set(key, result);
        return result;
    }

    return visit(start, initialQuote);
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
                const escapedQuote = backslashCount % 2 === 1;
                const canEscapeQuote = escapedQuote && quote !== undefined && canBalanceQuotes(trimmed, backslashEnd + 1, quote);
                if (escapedQuote && (!quote || canEscapeQuote)) {
                    current += "\\".repeat(backslashCount - 1);
                    current += next;
                    i = backslashEnd;
                } else {
                    current += "\\".repeat(backslashCount);
                    i = backslashEnd - 1;
                }
            } else {
                current += "\\".repeat(backslashCount);
                i = backslashEnd - 1;
            }
            tokenStarted = true;
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
    if (!Array.isArray(options)) {
        return splitMavenExecutableOptions(options);
    }

    const args: string[] = [];
    for (const option of options) {
        args.push(...splitMavenExecutableOptions(option));
    }
    return args;
}
