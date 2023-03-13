// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITreeItem } from "./ITreeItem";
import { Menu } from "./Menu";

export class ProfilesMenu extends Menu implements ITreeItem {
    constructor() {
        super();
        this.name = "Profiles";
    }

    public getContextValue(): string {
        return "maven:profilesMenu";
    }

    public getChildren() : any[] {
        return [];
    }
}
