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

function quoteBalanceLookup(value: string): (index: number, quote: string | undefined, escapedQuoteOpen: boolean) => boolean {
    const quoteStates: Array<string | undefined> = [undefined, "\"", "'"];
    const backslashEnds: number[] = new Array(value.length);
    for (let index = value.length - 1; index >= 0; index--) {
        backslashEnds[index] = value[index] === "\\"
            ? (value[index + 1] === "\\" ? backslashEnds[index + 1] : index + 1)
            : index;
    }

    const stateKey = (index: number, quote: string | undefined, escapedQuoteOpen: boolean): string =>
        `${index}:${quote ?? ""}:${escapedQuoteOpen}`;
    const balanced = new Map<string, boolean>();
    for (const quote of quoteStates) {
        for (const escapedQuoteOpen of [false, true]) {
            balanced.set(stateKey(value.length, quote, escapedQuoteOpen), quote === undefined);
        }
    }

    const get = (index: number, quote: string | undefined, escapedQuoteOpen: boolean): boolean =>
        balanced.get(stateKey(index, quote, escapedQuoteOpen)) === true;
    for (let index = value.length - 1; index >= 0; index--) {
        for (const quote of quoteStates) {
            for (const escapedQuoteOpen of [false, true]) {
                const ch = value[index];
                let result: boolean;
                if (ch === "\\") {
                    const backslashEnd = backslashEnds[index];
                    const next = value[backslashEnd];
                    const escapedQuote = (next === "\"" || next === "'")
                        && (!quote || next === quote)
                        && (backslashEnd - index) % 2 === 1;
                    if (!escapedQuote) {
                        result = get(backslashEnd, quote, escapedQuoteOpen);
                    } else if (!quote) {
                        result = get(backslashEnd + 1, undefined, false);
                    } else if (escapedQuoteOpen) {
                        result = get(backslashEnd + 1, quote, false)
                            || get(backslashEnd + 1, undefined, false);
                    } else {
                        result = get(backslashEnd + 1, quote, true)
                            || get(backslashEnd + 1, undefined, false);
                    }
                } else if (quote) {
                    result = ch === quote
                        ? get(index + 1, undefined, false)
                        : get(index + 1, quote, escapedQuoteOpen);
                } else if (ch === "\"" || ch === "'") {
                    result = get(index + 1, ch, false);
                } else {
                    result = get(index + 1, undefined, false);
                }
                balanced.set(stateKey(index, quote, escapedQuoteOpen), result);
            }
        }
    }
    return get;
}

export function splitMavenExecutableOptions(options: string | undefined): string[] {
    if (!options) {
        return [];
    }

    const args: string[] = [];
    let current = "";
    let quote: string | undefined;
    let escapedQuoteOpen = false;
    let tokenStarted = false;
    const trimmed = options.trim();
    const quotesCanBalance = quoteBalanceLookup(trimmed);
    for (let i = 0; i < trimmed.length; i++) {
        const ch = trimmed[i];

        if (ch === "\\") {
            let backslashEnd = i;
            while (trimmed[backslashEnd] === "\\") {
                backslashEnd++;
            }
            const backslashCount = backslashEnd - i;
            const next = trimmed[backslashEnd];
            if (!quote && next !== undefined && /\s/.test(next) && backslashCount % 2 === 1) {
                current += "\\".repeat(Math.floor(backslashCount / 2));
                current += next;
                i = backslashEnd;
                tokenStarted = true;
                continue;
            }
            if ((next === "\"" || next === "'") && (!quote || next === quote)) {
                const escapedQuote = backslashCount % 2 === 1;
                const escapedContinuationBalances = quote !== undefined
                    && quotesCanBalance(backslashEnd + 1, quote, true);
                const closingContinuationBalances = quote !== undefined
                    && quotesCanBalance(backslashEnd + 1, undefined, false);
                const continuationLooksLikeOption = /^\s+["']?-/.test(trimmed.slice(backslashEnd + 1));
                const opensEscapedQuote = quote !== undefined
                    && !escapedQuoteOpen
                    && escapedContinuationBalances
                    && (!closingContinuationBalances || !continuationLooksLikeOption);
                const continuesEscapedQuote = quote !== undefined
                    && escapedQuoteOpen
                    && escapedContinuationBalances
                    && !closingContinuationBalances;
                const canEscapeQuote = !quote || opensEscapedQuote || continuesEscapedQuote;
                if (escapedQuote && canEscapeQuote) {
                    current += "\\".repeat(Math.floor(backslashCount / 2));
                    current += next;
                    i = backslashEnd;
                    if (quote) {
                        escapedQuoteOpen = !escapedQuoteOpen;
                    }
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
                escapedQuoteOpen = false;
            } else {
                current += ch;
            }
            continue;
        }

        if (ch === "\"" || ch === "'") {
            quote = ch;
            escapedQuoteOpen = false;
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
    return options.flatMap(option => splitMavenExecutableOptions(option));
}
