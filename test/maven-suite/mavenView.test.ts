// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { MavenExplorerProvider } from "../../src/explorer/MavenExplorerProvider";
import { MavenProject } from "../../src/explorer/model/MavenProject";
import { ensureExtensionActivated } from "../shared";

// tslint:disable: only-arrow-functions
suite("Maven Project View Tests", () => {

    suiteSetup(ensureExtensionActivated);

    test("Can list maven projects", async () => {
        const roots = await MavenExplorerProvider.getInstance().getChildren();
        assert.equal(roots?.length, 1, "Number of root node should be 1");

        const projectNode = roots![0] as MavenProject;
        assert.equal(projectNode.name, "my-app", "Project name should be \"my-app\"");
    });

});
