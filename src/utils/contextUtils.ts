// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import { Extension, ExtensionContext, extensions, window } from "vscode";
import { mavenOutputChannel } from "../mavenOutputChannel";
import { Utils } from "./Utils";

let EXTENSION_CONTEXT: ExtensionContext;
let EXTENSION_PUBLISHER: string;
let EXTENSION_NAME: string;
let EXTENSION_VERSION: string;
let EXTENSION_AI_KEY: string;
let MAVEN_LOCAL_REPOSITORY: string;
let TEMP_FOLDER_PER_USER: string;

export async function loadPackageInfo(context: ExtensionContext): Promise<void> {
    EXTENSION_CONTEXT = context;

    const { publisher, name, version, aiKey } = await fse.readJSON(context.asAbsolutePath("./package.json"));
    EXTENSION_AI_KEY = aiKey;
    EXTENSION_PUBLISHER = publisher;
    EXTENSION_NAME = name;
    EXTENSION_VERSION = version;

    TEMP_FOLDER_PER_USER = path.join(os.tmpdir(), `${EXTENSION_NAME}-${os.userInfo().username}`);

    // find Maven Local Repositry
    try {
        var userSettingsPath: string | undefined = await Utils.userCustomSettingPath()
        if(!userSettingsPath){
            userSettingsPath = path.join(os.homedir(), ".m2", "settings.xml");
        }
        const userSettings: {} | undefined = await Utils.parseXmlFile(userSettingsPath);
        MAVEN_LOCAL_REPOSITORY = path.resolve(_.get(userSettings, "settings.localRepository[0]"));
        mavenOutputChannel.appendLine(`local repository: ${MAVEN_LOCAL_REPOSITORY}`);
    } catch (error) {
        // ignore
    }

    if (!MAVEN_LOCAL_REPOSITORY) {
        MAVEN_LOCAL_REPOSITORY = path.join(os.homedir(), ".m2", "repository");
    }
}

export function getMavenLocalRepository(): string {
    return MAVEN_LOCAL_REPOSITORY;
}

export function getExtensionPublisher(): string {
    return EXTENSION_PUBLISHER;
}

export function getExtensionName(): string {
    return EXTENSION_NAME;
}

export function getExtensionId(): string {
    return `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
}

export function getExtensionVersion(): string {
    return EXTENSION_VERSION;
}

export function getAiKey(): string {
    return EXTENSION_AI_KEY;
}

export function getPathToTempFolder(...args: string[]): string {
    return path.join(TEMP_FOLDER_PER_USER, ...args);
}

export function getPathToExtensionRoot(...args: string[]): string {
    const ext: Extension<any> | undefined = extensions.getExtension(getExtensionId());
    if (!ext) {
        throw new Error("Cannot identify Maven extension.");
    }
    return path.join(ext.extensionPath, ...args);
}

export function getPathToWorkspaceStorage(...args: string[]): string | undefined {
    if (EXTENSION_CONTEXT.storagePath === undefined) {
        return undefined;
    }
    fse.ensureDirSync(EXTENSION_CONTEXT.storagePath);
    return path.join(EXTENSION_CONTEXT.storagePath, ...args);
}

export async function trustWrapper(mvnw: string): Promise<boolean> {
    const key: string = "trustMavenWrapper";
    const trust: boolean | undefined = EXTENSION_CONTEXT.workspaceState.get<boolean | undefined>(key);
    if (trust === undefined) {
        const msg: string = `Maven Wrapper is found in this workspace, do you trust it? (${mvnw})`;
        const YES: string = "Yes";
        const NO: string = "No";
        const choice: string | undefined = await window.showInformationMessage(msg, YES, NO);
        if (choice !== undefined) {
            EXTENSION_CONTEXT.workspaceState.update(key, choice === YES);
        }
        return choice === YES;
    } else {
        return trust;
    }
}
