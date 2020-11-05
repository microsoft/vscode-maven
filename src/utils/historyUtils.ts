// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as fse from "fs-extra";
import * as md5 from "md5";
import { getExtensionName, getPathToTempFolder } from "./contextUtils";

export interface ICommandHistory {
    pomPath: string;
    timestamps: { [command: string]: number };
}

export interface ICommandHistoryEntry {
    command: string;
    pomPath: string;
    timestamp: number;
}

export async function updateLRUCommands(command: string, pomPath: string): Promise<void> {
    const historyFilePath: string = getCommandHistoryCachePath(pomPath);
    await fse.ensureFile(historyFilePath);
    const content: string = (await fse.readFile(historyFilePath)).toString();
    let historyObject: ICommandHistory;
    try {
        historyObject = <ICommandHistory>JSON.parse(content);
        historyObject.pomPath = pomPath;
        historyObject.timestamps[command] = Date.now();
    } catch (error) {
        historyObject = { pomPath, timestamps: {} };
        historyObject.timestamps[command] = Date.now();
    }
    await fse.writeFile(historyFilePath, JSON.stringify(historyObject));
}

export async function getLRUCommands(pomPath: string): Promise<ICommandHistoryEntry[]> {
    const filepath: string = getCommandHistoryCachePath(pomPath);
    if (await fse.pathExists(filepath)) {
        const content: string = (await fse.readFile(filepath)).toString();
        let historyObject: ICommandHistory;
        try {
            historyObject = <ICommandHistory>JSON.parse(content);
        } catch (error) {
            historyObject = { pomPath, timestamps: {} };
        }
        const timestamps: { [command: string]: number } = historyObject.timestamps;
        const commandList: string[] = Object.keys(timestamps).sort((a, b) => timestamps[b] - timestamps[a]);
        return commandList.map(command => <ICommandHistoryEntry>Object.assign({ command, pomPath, timestamp: timestamps[command] }));
    }
    return [];
}

function getCommandHistoryCachePath(pomXmlFilePath: string): string {
    return getPathToTempFolder(md5(pomXmlFilePath), "commandHistory.json");
}
