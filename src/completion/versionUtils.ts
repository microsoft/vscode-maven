// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as _ from "lodash";
import {parse, SemVer} from "semver";

const VERSION_VALUE_MAX: number = 999;
const VERSION_VALUE_DIGITS: number = 3;
// tslint:disable-next-line:export-name
export function getSortText(version: string): string {
    const ver: SemVer = parse(version);
    const versionValues: number[] = ver ? [ver.major, ver.minor, ver.patch] : [0, 0, 0];
    return versionValues.map(v => _.padStart((VERSION_VALUE_MAX - v).toString(), VERSION_VALUE_DIGITS, "0")).join();
}
