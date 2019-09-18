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
  private isCaculating: boolean = false;

  constructor(pomPath: string) {
    this.pomPath = pomPath;
    this.emitter.on("complete", (resp: IEffectivePom) => {
      this.effectivePom = resp;
      this.isCaculating = false;
    });
    this.emitter.on("error", (_error) => {
      this.effectivePom = { pomPath };
      this.isCaculating = false;
    });
  }

  public async calculateEffectivePom(): Promise<void> {
    if (this.isCaculating) {
      return new Promise<void>((resolve, reject) => {
        this.emitter.once("complete", resolve);
        this.emitter.once("error", reject);
      });
    }

    const pomPath: string = this.pomPath;
    try {
      this.isCaculating = true;
      const ePomString: string | undefined = await rawEffectivePom(pomPath);
      const ePom: any = await Utils.parseXmlContent(ePomString ? ePomString : "");
      this.emitter.emit("complete", {
        pomPath,
        ePomString,
        ePom
      });
    } catch (error) {
      this.emitter.emit("error", error);
    }
  }

  public async getEffectivePom(): Promise<IEffectivePom> {
    const promise: Promise<IEffectivePom> = new Promise<IEffectivePom>((resolve, reject) => {
      this.emitter.once("complete", (resp: IEffectivePom) => {
        resolve(resp);
      });
      this.emitter.once("error", (error) => {
        reject(error);
      });
    });

    if (this.isCaculating) {
      return promise;
    }

    if (this.effectivePom) {
      return this.effectivePom;
    }

    this.calculateEffectivePom().catch(console.error);
    return promise;
  }
}
