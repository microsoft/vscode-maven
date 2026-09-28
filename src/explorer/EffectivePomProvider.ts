// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { EffectivePomOptions, MavenExecutionGuard, rawEffectivePom } from "../utils/mavenUtils";
import { Utils } from "../utils/Utils";
import { IEffectivePom } from "./model/IEffectivePom";

export class EffectivePomProvider {
  private pomPath: string;
  private calculation?: {
    beforeExecute?: MavenExecutionGuard;
    cacheOnly: boolean;
    promise: Promise<IEffectivePom | undefined>;
  };

  constructor(pomPath: string) {
    this.pomPath = pomPath;
  }

  public async calculateEffectivePom(options?: EffectivePomOptions): Promise<void> {
    await this.getEffectivePom(options);
  }

  private async readEffectivePom(options: EffectivePomOptions): Promise<IEffectivePom | undefined> {
    const pomPath: string = this.pomPath;
    const ePomString: string | undefined = await rawEffectivePom(pomPath, options);
    if (ePomString === undefined) {
      return undefined;
    }
    const ePom: unknown = await Utils.parseXmlContent(ePomString);
    return { pomPath, ePomString, ePom };
  }

  public async getEffectivePom(options?: EffectivePomOptions): Promise<IEffectivePom | undefined> {
    const beforeExecute = options?.beforeExecute;
    const cacheOnly = options?.cacheOnly === true;
    while (this.calculation) {
      const current = this.calculation;
      if (current.beforeExecute === beforeExecute && current.cacheOnly === cacheOnly) {
        return current.promise;
      }
      // Only wait for incompatible work; its result or failure belongs to its own callers.
      await Promise.allSettled([current.promise]);
    }

    const promise = this.readEffectivePom({ beforeExecute, cacheOnly });
    this.calculation = { beforeExecute, cacheOnly, promise };
    try {
      return await promise;
    } finally {
      this.calculation = undefined;
    }
  }
}
