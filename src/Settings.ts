// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { Uri, workspace } from "vscode";
import { FavoriteCommand } from "./explorer/model/FavoriteCommand";
import { MavenProject } from "./explorer/model/MavenProject";

type FavoriteFormat = { alias?: string; command: string; debug?: boolean }
export class Settings {
    public static excludedFolders(resource: Uri): string[] {
        const ret: string[] | undefined = _getMavenSection<string[]>("excludedFolders", resource);
        return ret !== undefined ? ret : [];
    }

    public static showInExplorerContextMenu(): boolean {
        return !!_getMavenSection<boolean>("maven.showInExplorerContextMenu");
    }

    public static enableConflictDiagnostics(): boolean {
        return !!_getMavenSection<boolean>("dependency.enableConflictDiagnostics");
    }

    public static viewType(): string | undefined {
        return _getMavenSection("view");
    }

    public static changeToFlatView(): void {
        workspace.getConfiguration().update("maven.view", "flat", false);
    }

    public static changeToHierarchicalView(): void {
        workspace.getConfiguration().update("maven.view", "hierarchical", false);
    }

    public static storeFavorite(favorite: FavoriteFormat): void {
        const favorites: FavoriteFormat[] = workspace.getConfiguration().get("maven.terminal.favorites") ?? [];
        favorites.push(favorite);
        workspace.getConfiguration().update("maven.terminal.favorites", favorites);
    }

    public static setMavenExecutablePath(mvnPath: string): void {
        workspace.getConfiguration().update("maven.executable.path", mvnPath, true);
    }

    public static getSettingsFilePath(): string | undefined {
        return _getMavenSection<string>("settingsFile");
    }

    public static External = class {
        public static javaHome(): string | undefined {
            return workspace.getConfiguration("java").get<string>("home");
        }

        public static defaultWindowsShell(): string | undefined {
            return workspace.getConfiguration("terminal").get<string>("integrated.shell.windows");
        }
    }

    public static Terminal = class {
        public static useJavaHome(): boolean {
            return !!_getMavenSection<boolean>("terminal.useJavaHome");
        }

        public static customEnv(resourceOrFilepath?: Uri | string): {
            environmentVariable: string;
            value: string;
        }[] | undefined {
            return _getMavenSection("terminal.customEnv", resourceOrFilepath);
        }

        public static favorites(project: MavenProject): FavoriteCommand[] | undefined {
            type Favorite = { alias: string, command: string, debug?: boolean };
            return _getMavenSection<Favorite[]>("terminal.favorites", vscode.Uri.file(project.pomPath))?.map(favorite => new FavoriteCommand(project, favorite.command, favorite.alias, favorite.debug));
        }
    }
    public static Executable = class {
        public static path(resourceOrFilepath?: Uri | string): string | undefined {
            return _getMavenSection("executable.path", resourceOrFilepath);
        }
        public static options(resourceOrFilepath?: Uri | string): string | undefined {
            return _getMavenSection("executable.options", resourceOrFilepath);
        }
        public static preferMavenWrapper(resourceOrFilepath?: Uri | string): boolean {
            return !!_getMavenSection<boolean>("executable.preferMavenWrapper", resourceOrFilepath);
        }
    }

    public static Pomfile = class {
        public static autoUpdateEffectivePOM(): boolean {
            return !!_getMavenSection<boolean>("pomfile.autoUpdateEffectivePOM");
        }

        public static globPattern(): string {
            const ret: string | undefined = _getMavenSection<string>("pomfile.globPattern");
            return ret !== undefined ? ret : "**/pom.xml";
        }

        public static prefetchEffectivePom(): boolean {
            return !!_getMavenSection<string>("pomfile.prefetchEffectivePom");
        }
    }

    public static getEnvironment(resourceOrFilepath?: Uri | string): { [key: string]: string } {
        const customEnv: { [key: string]: string } = _getJavaHomeEnvIfAvailable();
        type EnvironmentSetting = {
            environmentVariable: string;
            value: string;
        };
        const environmentSettings: EnvironmentSetting[] | undefined = Settings.Terminal.customEnv(resourceOrFilepath);
        if (environmentSettings) {
            environmentSettings.forEach((s: EnvironmentSetting) => {
                customEnv[s.environmentVariable] = s.value;
            });
        }
        return customEnv;
    }

    /**
     * Get effective label of project node according to settings,
     * filling ${project.groupId}, ${project.artifactId}, ${project.version}, ${project.name}
     */
    public static getExploreProjectName(project: {
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


function _getMavenSection<T>(section: string, resourceOrFilepath?: Uri | string): T | undefined {
    let resource: Uri | undefined;
    if (typeof resourceOrFilepath === "string") {
        resource = Uri.file(resourceOrFilepath);
    } else if (resourceOrFilepath instanceof Uri) {
        resource = resourceOrFilepath;
    }
    return workspace.getConfiguration("maven", resource).get<T>(section);
}

function _getJavaHomeEnvIfAvailable(): { [key: string]: string } {
    // Look for the java.home setting from the redhat.java extension.  We can reuse it
    // if it exists to avoid making the user configure it in two places.
    const useJavaHome: boolean = Settings.Terminal.useJavaHome();
    const javaHome: string | undefined = Settings.External.javaHome();
    if (useJavaHome && javaHome) {
        return { JAVA_HOME: javaHome };
    } else {
        return {};
    }
}