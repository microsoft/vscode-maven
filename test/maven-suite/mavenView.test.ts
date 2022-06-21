// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { mavenExplorerProvider, MavenProject } from "../../extension.bundle";
import { ensureExtensionActivated } from "../shared";

// tslint:disable: only-arrow-functions
suite("Maven Project View Tests", () => {

    suiteSetup(ensureExtensionActivated);

    test("Can list maven projects", async () => {
        const roots = await mavenExplorerProvider.getChildren();
        assert.equal(roots?.length, 1, "Number of root node should be 1");

        const projectNode = roots![0] as MavenProject;
        assert.equal(projectNode.name, "my-app", "Project name should be \"my-app\"");
    });

});
