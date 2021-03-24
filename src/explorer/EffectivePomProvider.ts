// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { EventEmitter } from "events";
import { rawEffectivePom } from "../utils/mavenUtils";
import { Utils } from "../utils/Utils";
import { IEffectivePom } from "./model/IEffectivePom";

export class EffectivePomProvider {
  private pomPath: string;
  private effectivePom: IEffectivePom;
  private emitter: EventEmitter = new EventEmitter();
  private isCalculating: boolean = false;

  constructor(pomPath: string) {
    this.pomPath = pomPath;
    this.emitter.on("complete", (resp: IEffectivePom) => {
      this.effectivePom = resp;
      this.isCalculating = false;
    });
    this.emitter.on("error", (_error) => {
      this.effectivePom = { pomPath };
      this.isCalculating = false;
    });
  }

  public async calculateEffectivePom(options?: {cacheOnly?: boolean}): Promise<void> {
    if (this.isCalculating) {
      return new Promise<void>((resolve, reject) => {
        this.emitter.once("complete", resolve);
        this.emitter.once("error", reject);
      });
    }

    const pomPath: string = this.pomPath;
    try {
      this.isCalculating = true;
      const ePomString: string | undefined = await rawEffectivePom(pomPath, options);
      if (ePomString === undefined) {
        this.emitter.emit("complete", undefined);
      } else {
        const ePom: any = await Utils.parseXmlContent(ePomString);
        this.emitter.emit("complete", {
          pomPath,
          ePomString,
          ePom
        });
      }
    } catch (error) {
      this.emitter.emit("error", error);
    }
  }

  public async getEffectivePom(options?: {cacheOnly?: boolean}): Promise<IEffectivePom> {
    const promise: Promise<IEffectivePom> = new Promise<IEffectivePom>((resolve, reject) => {
      this.emitter.once("complete", (resp: IEffectivePom) => {
        resolve(resp);
      });
      this.emitter.once("error", (error) => {
        reject(error);
      });
    });

    if (this.isCalculating) {
      return promise;
    }

    if (this.effectivePom !== undefined) {
      return this.effectivePom;
    }

    this.calculateEffectivePom(options).catch(console.error);
    return promise;
  }
}
