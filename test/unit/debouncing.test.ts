// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as assert from "assert";
import { LruCache } from "../../src/debouncing";

describe("LruCache", () => {
    it("evicts the least recently used entry", () => {
        const cache = new LruCache<string, object>(2);
        const first = {};
        const second = {};
        const third = {};

        cache.set("first", first);
        cache.set("second", second);
        assert.equal(cache.get("first"), first);

        cache.set("third", third);

        assert.equal(cache.get("first"), first);
        assert.equal(cache.get("second"), undefined);
        assert.equal(cache.get("third"), third);
    });
});
