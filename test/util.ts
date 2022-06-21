// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export async function sleep(time: number) {
    await new Promise((resolve) => setTimeout(resolve, time));
}
