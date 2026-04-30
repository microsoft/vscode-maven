// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";
import { buildArchetypeGenerateArgs, splitMavenExecutableOptions } from "../../src/archetype/archetypeCommand";

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

    it("preserves backslashes in Windows paths", () => {
        assert.deepEqual(
            splitMavenExecutableOptions("-Dmaven.repo.local=C:\\Users\\demo\\.m2\\repository"),
            ["-Dmaven.repo.local=C:\\Users\\demo\\.m2\\repository"]
        );
    });
});
