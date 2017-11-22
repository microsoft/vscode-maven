import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
export class MavenArchetype implements QuickPickItem {
    label: string;
    description: string;
    artifactId: string;
    groupId: string;
    versions: string[];
    constructor(aid: string, gid: string, desc?: string) {
        this.artifactId = aid;
        this.groupId = gid;
        this.versions = [];
        this.label = `${gid}:${aid}`;
        this.description = desc;
    }
}