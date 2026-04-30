// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

"use strict";

const childProcess = require("child_process");
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

function shouldExcludePlan(planFile) {
    const content = fs.readFileSync(path.join(absolutePlansDir, planFile), "utf8");
    const platforms = readTopLevelList(content, "platforms");
    const skipPlatforms = readTopLevelList(content, "skipPlatforms");
    return platforms.length > 0
        ? !platforms.includes(currentPlatform)
        : skipPlatforms.includes(currentPlatform);
}

const excludePlans = fs.readdirSync(absolutePlansDir)
    .filter(file => file.endsWith(".yaml") || file.endsWith(".yml"))
    .filter(shouldExcludePlan)
    .map(file => path.basename(file, path.extname(file)));

if (excludePlans.length > 0) {
    console.log(`Skipping autotest plans on ${currentPlatform}: ${excludePlans.join(", ")}`);
}

const args = ["run-all", plansDir];
if (excludePlans.length > 0) {
    args.push("--exclude", excludePlans.join(","));
}

const result = childProcess.spawnSync("autotest", args, {
    stdio: "inherit",
    shell: true
});

process.exit(result.status ?? 1);
