// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as assert from "assert";
import * as vscode from "vscode";
import {before} from "mocha";

suite("Extension Test Suite", () => {
    before(() => {
        vscode.window.showInformationMessage("Start all tests.");
    });

    test("Extension should be present", () => {
        assert.ok(vscode.extensions.getExtension("vscjava.vscode-maven"));
    });

    test("should activate", () => {
        const ext = vscode.extensions.getExtension("vscjava.vscode-maven");
        assert.notEqual(ext, null);
        return ext!.activate().then(() => {
            assert.ok(true);
        });
    });
});