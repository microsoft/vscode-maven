import * as fse from "fs-extra";
import * as os from "os";
import * as path from "path";
import { ExtensionContext,  extensions } from "vscode";

let EXTENSION_PUBLISHER: string;
let EXTENSION_NAME: string;
let EXTENSION_VERSION: string;
let EXTENSION_AI_KEY: string;

export async function loadPackageInfo(context: ExtensionContext): Promise<void> {
    const { publisher, name, version, aiKey } = await fse.readJSON(context.asAbsolutePath("./package.json"));
    EXTENSION_AI_KEY = aiKey;
    EXTENSION_PUBLISHER = publisher;
    EXTENSION_NAME = name;
    EXTENSION_VERSION = version;
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
    return path.join(os.tmpdir(), ...args);
}

export function getPathToExtensionRoot(...args: string[]): string {
    return path.join(extensions.getExtension(getExtensionId()).extensionPath, ...args);
}
