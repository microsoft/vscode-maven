// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";

const VERSION_VALUE_MAX: number = 999;
const VERSION_VALUE_DIGITS: number = 3;
// tslint:disable-next-line:export-name
export function getSortText(version: string): string {
    const segments: string[] = version.split(/\.|-/);
    const [major, minor, patch] = segments.map(x => Number.parseInt(x, 10)).map(x => Number.isInteger(x) ? x : 0);
    return [major, minor, patch].map(v => _.padStart((VERSION_VALUE_MAX - v).toString(), VERSION_VALUE_DIGITS, "0")).join("");
}
