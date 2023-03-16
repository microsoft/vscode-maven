// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITreeItem } from "./ITreeItem";
import { MavenProfile } from "./MavenProfile";
import { MavenProject } from "./MavenProject";
import { ProjectMenu } from "./Menu";

export class ProfilesMenu extends ProjectMenu implements ITreeItem {
    constructor(project: MavenProject) {
        super(project);
        this.name = "Profiles";
    }

    public getContextValue(): string {
        return "maven:profilesMenu";
    }

    public async getChildren() : Promise<MavenProfile[]> {
        if (this.project.profiles === undefined) {
            await this.project.refreshProfiles();
        }
        return this.project.profiles;
    }

    public async refresh(): Promise<void> {
        await this.project.refreshProfiles();
    }
}
