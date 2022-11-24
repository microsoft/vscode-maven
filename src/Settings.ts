// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Uri, workspace } from "vscode";
import { FavoriteCommand } from "./explorer/model/FavoriteCommand";
import { MavenProject } from "./explorer/model/MavenProject";

type FavoriteFormat = {alias: string; command: string; debug?: boolean}
export namespace Settings {
    export function excludedFolders(resource: Uri): string[] {
        const ret: string[] | undefined = _getMavenSection<string[]>("excludedFolders", resource);
        return ret !== undefined ? ret : [];
    }

    export function showInExplorerContextMenu(): boolean {
        return !!_getMavenSection<boolean>("maven.showInExplorerContextMenu");
    }

    export function enableConflictDiagnostics(): boolean {
        return !!_getMavenSection<boolean>("dependency.enableConflictDiagnostics");
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

    export function storeFavorite(favorite: FavoriteFormat): void {
        const favorites: FavoriteFormat[] = workspace.getConfiguration().get("maven.terminal.favorites") ?? [];
        favorites.push(favorite);
        workspace.getConfiguration().update("maven.terminal.favorites", favorites);
    }

    export function setMavenExecutablePath(mvnPath: string): void {
        workspace.getConfiguration().update("maven.executable.path", mvnPath, true);
    }

    export function getSettingsFilePath(): string | undefined {
        return _getMavenSection<string>("settingsFile");
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
            return !!_getMavenSection<boolean>("terminal.useJavaHome");
        }

        export function customEnv(resourceOrFilepath?: Uri | string): {
            environmentVariable: string;
            value: string;
        }[] | undefined {
            return _getMavenSection("terminal.customEnv", resourceOrFilepath);
        }

        export function favorites(project: MavenProject): FavoriteCommand[] | undefined {
            type Favorite = {alias: string, command: string, debug?: boolean};
            return _getMavenSection<Favorite[]>("terminal.favorites", vscode.Uri.file(project.pomPath))?.map(favorite => new FavoriteCommand(project, favorite.command, favorite.alias, favorite.debug));
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
            return !!_getMavenSection<boolean>("executable.preferMavenWrapper", resourceOrFilepath);
        }
    }

    export namespace Pomfile {
        export function autoUpdateEffectivePOM(): boolean {
            return !!_getMavenSection<boolean>("pomfile.autoUpdateEffectivePOM");
        }

        export function globPattern(): string {
            const ret: string | undefined = _getMavenSection<string>("pomfile.globPattern");
            return ret !== undefined ? ret : "**/pom.xml";
        }

        export function prefetchEffectivePom(): boolean {
            return !!_getMavenSection<string>("pomfile.prefetchEffectivePom");
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

    export function getEnvironment(resourceOrFilepath?: Uri | string): { [key: string]: string } {
        const customEnv: any = _getJavaHomeEnvIfAvailable();
        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        };
        const environmentSettings: EnvironmentSetting[] | undefined = Terminal.customEnv(resourceOrFilepath);
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

    /**
     * Get effective label of project node according to settings,
     * filling ${project.groupId}, ${project.artifactId}, ${project.version}, ${project.name}
     */
    export function getExploreProjectName(project: {
        pomPath?: string;
        artifactId: string;
        groupId: string;
        version: string;
        name: string;
    }) {
        const template = _getMavenSection<string>("explorer.projectName", project.pomPath);
        if (!template) {
            return "Unknown";
        }

        return template.replace("${project.name}", project.name)
            .replace("${project.groupId}", project.groupId)
            .replace("${project.artifactId}", project.artifactId)
            .replace("${project.version}", project.version);
    }
}
