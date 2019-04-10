// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { rawEffectivePom } from "../../utils/mavenUtils";
import { Utils } from "../../utils/Utils";

export class EffectivePom {

    public pomPath: string;
    public raw: string | undefined;
    public data: any;
    private _updating: boolean;

    constructor(pomPath: string) {
        this.pomPath = pomPath;
        this._updating = false;
    }

    /**
     * Generate effective pom and parse the data
     */
    public async update(silent?: boolean): Promise<void> {
        if (this._updating) {
            return;
        }

        this._updating = true;
        try {
            this.raw = silent ? await rawEffectivePom(this.pomPath) : await Utils.getEffectivePom(this.pomPath);
            this.data = await Utils.parseXmlContent(this.raw ? this.raw : "");
        } catch (error) {
            throw error;
        } finally {
            this._updating = false;
        }
    }
}
