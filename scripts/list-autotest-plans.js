// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

// Emits a JSON array of autotest plan basenames (no extension) that should run
// on the requested platform, after honoring per-plan `platforms:` /
// `skipPlatforms:` filters. Intended for GitHub Actions matrix discovery:
//
//   AUTOTEST_PLATFORM=win32 node scripts/list-autotest-plans.js
//     => ["maven-smoke","maven-archetype-create-project",...]
//
// The platform filter logic is intentionally kept in lock-step with
// scripts/run-autotest-plans.js so a plan that runs locally also appears in CI.

const fs = require("fs");
const path = require("path");

const plansDir = process.argv[2] || "test-plans";
const absolutePlansDir = path.resolve(plansDir);
const currentPlatform = normalizePlatformName(process.env.AUTOTEST_PLATFORM || process.platform);

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

function shouldIncludePlan(planFile) {
    const content = fs.readFileSync(path.join(absolutePlansDir, planFile), "utf8");
    const platforms = readTopLevelList(content, "platforms");
    const skipPlatforms = readTopLevelList(content, "skipPlatforms");
    if (platforms.length > 0) {
        return platforms.includes(currentPlatform);
    }
    return !skipPlatforms.includes(currentPlatform);
}

const plans = fs.readdirSync(absolutePlansDir)
    .filter(file => file.endsWith(".yaml") || file.endsWith(".yml"))
    .filter(shouldIncludePlan)
    .map(file => path.basename(file, path.extname(file)))
    .sort();

process.stdout.write(JSON.stringify(plans));
