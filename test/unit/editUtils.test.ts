// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { strict as assert } from "assert";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const proxyquire: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    noPreserveCache: () => (request: string, stubs: Record<string, any>) => any;
} = require("proxyquire");

class FakeUri {
    public static parse(value: string): FakeUri {
        return new FakeUri(value);
    }

    private constructor(public readonly value: string) { }
}

class FakeRange {
    constructor(
        public readonly startLine: number,
        public readonly startCharacter: number,
        public readonly endLine: number,
        public readonly endCharacter: number
    ) { }
}

class FakeTextEdit {
    constructor(public readonly range: FakeRange, public readonly newText: string) { }
}

interface Operation {
    kind: string;
    args: unknown[];
}

class FakeWorkspaceEdit {
    public readonly operations: Operation[] = [];

    public set(...args: unknown[]): void {
        this.operations.push({ kind: "set", args });
    }

    public replace(...args: unknown[]): void {
        this.operations.push({ kind: "replace", args });
    }

    public createFile(...args: unknown[]): void {
        this.operations.push({ kind: "create", args });
    }

    public renameFile(...args: unknown[]): void {
        this.operations.push({ kind: "rename", args });
    }

    public deleteFile(...args: unknown[]): void {
        this.operations.push({ kind: "delete", args });
    }
}

interface EditUtilsModule {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    convertWorkspaceEdit: (edit: any) => FakeWorkspaceEdit;
}

function load(): EditUtilsModule {
    return proxyquire.noPreserveCache()("../../src/utils/editUtils", {
        vscode: {
            Range: FakeRange,
            TextEdit: FakeTextEdit,
            Uri: FakeUri,
            WorkspaceEdit: FakeWorkspaceEdit,
            "@noCallThru": true
        }
    }) as EditUtilsModule;
}

describe("convertWorkspaceEdit", () => {
    it("converts plain text changes", () => {
        const converted = load().convertWorkspaceEdit({
            changes: {
                "file:///project/pom.xml": [{
                    range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
                    newText: "replacement"
                }]
            }
        });

        assert.equal(converted.operations.length, 1);
        assert.equal((converted.operations[0].args[0] as FakeUri).value, "file:///project/pom.xml");
        const edits = converted.operations[0].args[1] as FakeTextEdit[];
        assert.deepEqual(edits[0], new FakeTextEdit(new FakeRange(1, 2, 3, 4), "replacement"));
    });

    it("preserves document change order and annotations", () => {
        const converted = load().convertWorkspaceEdit({
            changeAnnotations: { migration: { label: "Migration", needsConfirmation: true } },
            documentChanges: [
                { kind: "create", uri: "file:///new.xml", annotationId: "migration" },
                {
                    textDocument: { uri: "file:///new.xml", version: null },
                    edits: [{
                        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                        newText: "content",
                        annotationId: "migration"
                    }]
                },
                { kind: "rename", oldUri: "file:///new.xml", newUri: "file:///pom.xml" },
                { kind: "delete", uri: "file:///old.xml" }
            ]
        });

        assert.deepEqual(converted.operations.map(operation => operation.kind), ["create", "replace", "rename", "delete"]);
        assert.deepEqual(converted.operations[0].args[2], { label: "Migration", needsConfirmation: true, description: undefined });
        assert.equal((converted.operations[1].args[0] as FakeUri).value, "file:///new.xml");
        assert.deepEqual(converted.operations[1].args[1], new FakeRange(0, 0, 0, 0));
        assert.equal(converted.operations[1].args[2], "content");
        assert.deepEqual(converted.operations[1].args[3], { label: "Migration", needsConfirmation: true, description: undefined });
    });

    it("rejects unsupported snippet edits explicitly", () => {
        assert.throws(() => load().convertWorkspaceEdit({
            documentChanges: [{
                textDocument: { uri: "file:///pom.xml", version: null },
                edits: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, snippet: { value: "${1:value}" } }]
            }]
        }), /Snippet text edits are not supported/);
    });
});
