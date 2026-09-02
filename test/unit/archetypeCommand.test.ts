// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import { buildArchetypeGenerateArgs, getMavenExecutableOptionArgs, splitMavenExecutableOptions } from "../../src/archetype/archetypeCommand";

describe("buildArchetypeGenerateArgs", () => {
    it("builds Maven archetype properties as discrete arguments without embedded quotes", () => {
        assert.deepEqual(
            buildArchetypeGenerateArgs({
                archetypeArtifactId: "maven-archetype-quickstart",
                archetypeGroupId: "org.apache.maven.archetypes",
                archetypeVersion: "1.4",
                groupId: "com.example",
                artifactId: "demo"
            }),
            [
                "org.apache.maven.plugins:maven-archetype-plugin:3.1.2:generate",
                "-DarchetypeArtifactId=maven-archetype-quickstart",
                "-DarchetypeGroupId=org.apache.maven.archetypes",
                "-DarchetypeVersion=1.4",
                "-DgroupId=com.example",
                "-DartifactId=demo"
            ]
        );
    });

    it("adds outputDirectory as a discrete argument for embedded Maven fallback", () => {
        assert.deepEqual(
            buildArchetypeGenerateArgs({
                archetypeArtifactId: "maven-archetype-quickstart",
                archetypeGroupId: "org.apache.maven.archetypes",
                archetypeVersion: "1.4",
                groupId: "com.example",
                artifactId: "demo",
                outputDirectory: "C:\\Users\\demo user\\projects"
            }).slice(-1),
            ["-DoutputDirectory=C:\\Users\\demo user\\projects"]
        );
    });
});

describe("splitMavenExecutableOptions", () => {
    it("splits empty options into no arguments", () => {
        assert.deepEqual(splitMavenExecutableOptions(undefined), []);
        assert.deepEqual(splitMavenExecutableOptions(""), []);
    });

    it("preserves quoted option values containing whitespace", () => {
        assert.deepEqual(
            splitMavenExecutableOptions("-X -DskipTests -Dmessage=\"hello world\" '-Dname=demo app'"),
            ["-X", "-DskipTests", "-Dmessage=hello world", "-Dname=demo app"]
        );
    });

    it("preserves backslashes in Windows and UNC paths", () => {
        assert.deepEqual(
            splitMavenExecutableOptions("-Dmaven.repo.local=C:\\Users\\demo\\.m2\\repository -Dshare=\\\\server\\share"),
            ["-Dmaven.repo.local=C:\\Users\\demo\\.m2\\repository", "-Dshare=\\\\server\\share"]
        );
    });

    it("preserves backslashes in quoted values", () => {
        assert.deepEqual(
            splitMavenExecutableOptions("\"-Dregex=\\\\d+\""),
            ["-Dregex=\\\\d+"]
        );
    });

    it("preserves escaped literal quotes inside quoted values", () => {
        assert.deepEqual(
            splitMavenExecutableOptions("-DargLine=\"-Dmessage=\\\"hello world\\\"\""),
            ["-DargLine=-Dmessage=\"hello world\""]
        );
    });

    it("preserves a trailing backslash in a quoted Windows path", () => {
        assert.deepEqual(
            splitMavenExecutableOptions(String.raw`-Dpath="C:\work dir\" -X`),
            ["-Dpath=C:\\work dir\\", "-X"]
        );
    });

    it("does not use quotes from later arguments to close a Windows path", () => {
        assert.deepEqual(
            splitMavenExecutableOptions(String.raw`-Dpath="C:\work dir\" "-Dmessage=hello world"`),
            ["-Dpath=C:\\work dir\\", "-Dmessage=hello world"]
        );
    });

    it("ignores opposite-style quotes when finding a closing quote", () => {
        assert.deepEqual(
            splitMavenExecutableOptions(String.raw`-Dpath="C:\work dir\" '-Dmessage=hello "world'`),
            ["-Dpath=C:\\work dir\\", "-Dmessage=hello \"world"]
        );
    });

    it("preserves apostrophes inside a double-quoted value", () => {
        assert.deepEqual(
            splitMavenExecutableOptions(String.raw`-Dmessage="say \"Bob's hello\"" -X`),
            ["-Dmessage=say \"Bob's hello\"", "-X"]
        );
    });
});

describe("getMavenExecutableOptionArgs", () => {
    it("splits each array option fragment independently", () => {
        assert.deepEqual(
            getMavenExecutableOptionArgs(["-o", "-s ./settings.xml", "-Dmessage=\"hello world\""]),
            ["-o", "-s", "./settings.xml", "-Dmessage=hello world"]
        );
    });

    it("splits string options for backward compatibility", () => {
        assert.deepEqual(
            getMavenExecutableOptionArgs("-Dmessage=\"hello world\""),
            ["-Dmessage=hello world"]
        );
    });
});
