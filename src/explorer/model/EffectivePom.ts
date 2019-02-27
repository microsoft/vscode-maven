// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Utils } from "../../utils/Utils";

export class EffectivePom {

    public pomPath: string;
    public raw: string;
    public data: any;
    private _updating: boolean;

    constructor(pomPath: string) {
        this.pomPath = pomPath;
        this._updating = false;
    }

    /**
     * Generate effective pom and parse the data
     */
    public async update(): Promise<void> {
        if (this._updating) {
            return;
        }

        this._updating = true;
        try {
            this.raw = await Utils.getEffectivePom(this.pomPath);
            this.data = await Utils.parseXmlContent(this.raw);
        } catch (error) {
            console.error(error);
        }
        this._updating = false;

    }
}
