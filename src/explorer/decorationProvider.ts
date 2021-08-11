// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

const DECORATION_CONFLICT: vscode.FileDecoration = new vscode.FileDecoration("C", "conflict", new vscode.ThemeColor("list.warningForeground"));
const DECORATION_DUPLICATE: vscode.FileDecoration = new vscode.FileDecoration("D", "duplicate", new vscode.ThemeColor("list.deemphasizedForeground"));

class DecorationProvider implements vscode.FileDecorationProvider {
    private disposables: vscode.Disposable[] = [];
    constructor() {
        this.disposables.push(vscode.window.registerFileDecorationProvider(this));
    }

    public provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.query === "hasConflict") {
            return DECORATION_CONFLICT;
        } else if (uri.query === "isDuplicate") {
            return DECORATION_DUPLICATE;
        } else {
            return null;
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

export const decorationProvider: DecorationProvider = new DecorationProvider();
