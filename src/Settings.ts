// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri, workspace } from "vscode";

export namespace Settings {
    export namespace External {
        export function javaHome(): string {
            return workspace.getConfiguration("java").get<string>("home");
        }

        export function defaultWindowsShell(): string {
            return workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
        }
    }

    export function excludedFolders(resource: Uri): string[] {
        return _getMavenSection("excludedFolders", resource);
    }

    export namespace Terminal {
        export function useJavaHome(): boolean {
            return _getMavenSection("terminal.useJavaHome");
        }

        export function customEnv(): {
            environmentVariable: string;
            value: string;
        }[] {
            return _getMavenSection("terminal.customEnv");
        }
    }
    export namespace Executable {
        export function path(resource: Uri): string {
            return _getMavenSection("executable.path", resource);
        }
        export function options(resource: Uri): string {
            return _getMavenSection("executable.options", resource);
        }
    }

    function _getMavenSection<T>(section: string, resource?: Uri): T {
        return workspace.getConfiguration("maven", resource).get<T>(section);
    }
}
