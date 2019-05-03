// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Uri, workspace } from "vscode";

export namespace Settings {
    export function excludedFolders(resource: Uri): string[] {
        const ret: string[] | undefined = _getMavenSection<string[]>("excludedFolders", resource);
        return ret !== undefined ? ret : [];
    }

    export function viewType(): string | undefined {
        return _getMavenSection("view");
    }

    export function changeToFlatView(): void {
        workspace.getConfiguration().update("maven.view", "flat", false);
    }

    export function changeToHierarchicalView(): void {
        workspace.getConfiguration().update("maven.view", "hierarchical", false);
    }

    export namespace External {
        export function javaHome(): string | undefined {
            return workspace.getConfiguration("java").get<string>("home");
        }

        export function defaultWindowsShell(): string | undefined {
            return workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
        }
    }

    export namespace Terminal {
        export function useJavaHome(): boolean {
            return !!_getMavenSection("terminal.useJavaHome");
        }

        export function customEnv(): {
            environmentVariable: string;
            value: string;
        }[] | undefined {
            return _getMavenSection("terminal.customEnv");
        }

        export function favorites(resource: Uri): { alias: string; command: string }[] | undefined {
            return _getMavenSection("terminal.favorites", resource);
        }
    }
    export namespace Executable {
        export function path(resourceOrFilepath?: Uri | string): string | undefined {
            return _getMavenSection("executable.path", resourceOrFilepath);
        }
        export function options(resourceOrFilepath?: Uri | string): string | undefined {
            return _getMavenSection("executable.options", resourceOrFilepath);
        }
        export function preferMavenWrapper(resourceOrFilepath?: Uri | string): boolean {
            return !!_getMavenSection("executable.preferMavenWrapper", resourceOrFilepath);
        }
    }

    export namespace Pomfile {
        export function globPattern(): string {
            const ret: string | undefined = _getMavenSection<string>("pomfile.globPattern");
            return ret !== undefined ? ret : "**/pom.xml";
        }
    }


    function _getMavenSection<T>(section: string, resourceOrFilepath?: Uri | string): T | undefined {
        let resource: Uri | undefined;
        if (typeof resourceOrFilepath === "string") {
            resource = Uri.file(resourceOrFilepath);
        } else if (resourceOrFilepath instanceof Uri) {
            resource = resourceOrFilepath;
        }
        return workspace.getConfiguration("maven", resource).get<T>(section);
    }

    export function getEnvironment(): { [key: string]: string } {
        const customEnv: any = _getJavaHomeEnvIfAvailable();
        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        };
        const environmentSettings: EnvironmentSetting[] | undefined = Terminal.customEnv();
        if (environmentSettings) {
            environmentSettings.forEach((s: EnvironmentSetting) => {
                customEnv[s.environmentVariable] = s.value;
            });
        }
        return customEnv;
    }

    function _getJavaHomeEnvIfAvailable(): {} {
        // Look for the java.home setting from the redhat.java extension.  We can reuse it
        // if it exists to avoid making the user configure it in two places.
        const useJavaHome: boolean = Terminal.useJavaHome();
        const javaHome: string | undefined = External.javaHome();
        if (useJavaHome && javaHome) {
            return { JAVA_HOME: javaHome };
        } else {
            return {};
        }
    }
}
