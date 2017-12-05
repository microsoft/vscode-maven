import { QuickPickItem } from "vscode";
export class Archetype implements QuickPickItem {
    public label: string;
    public description: string;
    public artifactId: string;
    public groupId: string;
    public versions: string[];
    constructor(aid: string, gid: string, desc?: string) {
        this.artifactId = aid;
        this.groupId = gid;
        this.versions = [];
        this.label = `${gid}:${aid}`;
        this.description = desc;
    }
}
