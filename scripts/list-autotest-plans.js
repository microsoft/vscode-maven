// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

// Emits autotest plans that the GitHub Actions matrix should run, honoring
// per-plan `platforms:` / `skipPlatforms:` filters.
//
// Two output modes:
//
//   node scripts/list-autotest-plans.js [plansDir]
//     => ["maven-smoke","maven-archetype-create-project",...]
//     Single-platform list. Platform comes from $AUTOTEST_PLATFORM
//     (defaulting to process.platform). Used by callers that already know
//     which OS they target.
//
//   node scripts/list-autotest-plans.js --matrix [plansDir]
//     => [{os,os-name,platform,artifact,plan}, ...]
//     Cartesian of every supported runner OS and every plan that runs on it,
//     in a shape directly consumable as `strategy.matrix.include:` via
//     `fromJSON(...)`. Plans filtered out by platforms / skipPlatforms simply
//     do not appear for that OS.
//
// The platform filter logic is intentionally kept in lock-step with
// scripts/run-autotest-plans.js so a plan that runs locally also appears in CI.

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const matrixMode = args.includes("--matrix");
const positional = args.filter(a => !a.startsWith("--"));
const plansDir = positional[0] || "test-plans";
const absolutePlansDir = path.resolve(plansDir);
const currentPlatform = normalizePlatformName(process.env.AUTOTEST_PLATFORM || process.platform);

// Keep this list in sync with the matrix targets supported by CI.
const MATRIX_TARGETS = [
    { platform: "linux",  os: "ubuntu-latest",   "os-name": "linux",   artifact: "build-linux" },
    { platform: "darwin", os: "macos-latest",    "os-name": "macos",   artifact: "build-macos" },
    { platform: "win32",  os: "windows-latest",  "os-name": "windows", artifact: "build-windows" },
];

function readTopLevelList(content, key) {
    const blockMatch = content.match(new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s*[^\\n]+\\n?)+)`, "m"));
    if (blockMatch) {
        return blockMatch[1]
            .split(/\r?\n/)
            .map(line => line.match(/^\s*-\s*(.+?)\s*$/))
            .filter(Boolean)
            .map(match => normalizePlatformName(match[1]));
    }

    const inlineMatch = content.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, "m"));
    if (inlineMatch) {
        return inlineMatch[1]
            .split(",")
            .map(value => normalizePlatformName(value))
            .filter(Boolean);
    }

    return [];
}

function normalizePlatformName(value) {
    const platform = value.trim().replace(/^["']|["']$/g, "").toLowerCase();
    switch (platform) {
        case "windows":
        case "win":
            return "win32";
        case "macos":
        case "mac":
            return "darwin";
        case "ubuntu":
            return "linux";
        default:
            return platform;
    }
}

function shouldIncludePlan(planFile, platform) {
    const content = fs.readFileSync(path.join(absolutePlansDir, planFile), "utf8");
    const platforms = readTopLevelList(content, "platforms");
    const skipPlatforms = readTopLevelList(content, "skipPlatforms");
    if (platforms.length > 0) {
        return platforms.includes(platform);
    }
    return !skipPlatforms.includes(platform);
}

const allPlanFiles = fs.readdirSync(absolutePlansDir)
    .filter(file => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort();

if (matrixMode) {
    const include = [];
    for (const target of MATRIX_TARGETS) {
        for (const file of allPlanFiles) {
            if (shouldIncludePlan(file, target.platform)) {
                include.push({
                    ...target,
                    plan: path.basename(file, path.extname(file)),
                });
            }
        }
    }
    process.stdout.write(JSON.stringify(include));
} else {
    const plans = allPlanFiles
        .filter(file => shouldIncludePlan(file, currentPlatform))
        .map(file => path.basename(file, path.extname(file)));
    process.stdout.write(JSON.stringify(plans));
}
