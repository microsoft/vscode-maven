export class Archetype {
    public artifactId: string;
    public groupId: string;
    public repository: string;
    public description: string;
    public versions: string[];

    constructor(aid: string, gid: string, repo?: string, desc?: string) {
        this.artifactId = aid;
        this.groupId = gid;
        this.versions = [];
        this.description = desc;
        this.repository = repo;
    }
}
