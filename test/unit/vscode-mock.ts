// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * Minimal `vscode` module mock used by unit tests. Exposes only the surface
 * area consumed by the code under test (mavenUtils#checkExecutablePathSafety
 * and #promptForExecutableConfirmation). Individual tests override the stub
 * behaviours by reassigning the exported helpers before requiring the module
 * under test.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

export const showWarningMessageStub: { impl: AnyFn } = {
    impl: async () => undefined
};

export const getWorkspaceFolderStub: { impl: AnyFn } = {
    impl: () => undefined
};

export const executeCommandStub: { impl: AnyFn } = {
    impl: async () => undefined
};

export function resetStubs(): void {
    showWarningMessageStub.impl = async () => undefined;
    getWorkspaceFolderStub.impl = () => undefined;
    executeCommandStub.impl = async () => undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const vscodeMock: Record<string, any> = {
    window: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        showWarningMessage: (...args: any[]) => showWarningMessageStub.impl(...args)
    },
    workspace: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getWorkspaceFolder: (...args: any[]) => getWorkspaceFolderStub.impl(...args)
    },
    commands: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        executeCommand: (...args: any[]) => executeCommandStub.impl(...args)
    },
    Uri: {
        file: (p: string) => ({ fsPath: p, scheme: "file", toString: () => `file://${p}` })
    }
};
