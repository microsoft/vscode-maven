// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class Archetype {
    public artifactId: string;
    public groupId: string;
    public repository?: string;
    public description?: string;
    public versions: string[];

    constructor(aid: string, gid: string, repo?: string, desc?: string, versions: string[] = []) {
        this.artifactId = aid;
        this.groupId = gid;
        this.versions = versions;
        this.description = desc;
        this.repository = repo;
    }

    public get identifier(): string {
        return `${this.groupId}:${this.artifactId}`;
    }
}
