// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";

class DecorationProvider implements vscode.FileDecorationProvider {
    private disposables: vscode.Disposable[] = [];
    private decoration: vscode.FileDecoration = {color: new vscode.ThemeColor("list.warningForeground")};
    constructor() {
        this.disposables.push(vscode.window.registerFileDecorationProvider(this));
    }

    public provideFileDecoration(uri: vscode.Uri): vscode.ProviderResult<vscode.FileDecoration> {
        if (uri.query === "hasConflict") {
            return this.decoration;
        } else {
            return null;
        }
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}

export const decorationProvider: DecorationProvider = new DecorationProvider();
