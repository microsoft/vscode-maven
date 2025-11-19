// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import * as path from "path";

export class MavenProblemMatcher {
    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection("maven");
    }

    public parseMavenOutput(output: string, workspaceRoot: string): void {
        this.diagnosticCollection.clear();
        const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();

        const lines = output.split(/\r?\n/);
        for (const line of lines) {
            const diagnostic = this.parseErrorLine(line, workspaceRoot);
            if (diagnostic) {
                const filePath = diagnostic.file;
                if (!diagnosticsMap.has(filePath)) {
                    diagnosticsMap.set(filePath, []);
                }
                diagnosticsMap.get(filePath)!.push(diagnostic.diagnostic);
            }
        }

        for (const [filePath, diagnostics] of diagnosticsMap) {
            this.diagnosticCollection.set(vscode.Uri.file(filePath), diagnostics);
        }
    }

    private parseErrorLine(line: string, workspaceRoot: string): { file: string; diagnostic: vscode.Diagnostic } | null {
        // Match Maven error format: [ERROR] /path/to/file.java:[line,column] message
        const errorMatch = line.match(/^\[ERROR\]\s+(.+?):\[(\d+),(\d+)\]\s+(.+?)\r?$/);
        if (errorMatch) {
            const [, filePath, lineStr, columnStr, message] = errorMatch;
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
            const lineNum = parseInt(lineStr) - 1; // VS Code uses 0-based line numbers
            const columnNum = parseInt(columnStr) - 1;
            
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(lineNum, columnNum, lineNum, columnNum + 1),
                message,
                vscode.DiagnosticSeverity.Error
            );
            
            return { file: fullPath, diagnostic };
        }

        // Match Maven warning - general build warnings without specific file location
        const warningMatch = line.match(/^\[WARNING\]\s+(.+?)\r?$/);
        if (warningMatch && !warningMatch[1].includes('COMPILATION WARNING')) {
            const [, message] = warningMatch;
            
            // For general Maven warnings, create a diagnostic for the pom.xml file
            const pomPath = path.join(workspaceRoot, 'pom.xml');
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(0, 0, 0, 1),
                `Maven: ${message}`,
                vscode.DiagnosticSeverity.Warning
            );
            
            return { file: pomPath, diagnostic };
        }

        return null;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}

export const mavenProblemMatcher = new MavenProblemMatcher();