// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { getPathToExtensionRoot } from "../utils/contextUtils";
import * as fse from "fs-extra";
import * as _ from "lodash";
import { MarkdownString } from "vscode";

let schema: any;

export async function init() {
    const XSD_FILE_PATH = getPathToExtensionRoot("resources", "maven-4.0.0.xsd.json");
    try {
        schema = await fse.readJson(XSD_FILE_PATH);
    } catch (error) {
        console.error(`failed to parse ${XSD_FILE_PATH}`, error);
    }
}

export function getXsdElement(nodePath: string) {
    if (schema) {
        const obj = _.get(schema, nodePath);
        return new XSDElement(obj, nodePath);
    }
    return undefined;
}

export class XSDElement {
    constructor(private definitionObject: { [key: string]: any }, public nodePath: string) { }

    public get name() : string {
        const start = this.nodePath.lastIndexOf(".") + 1;
        return this.nodePath.slice(start);
    }

    public get documentation(): { version?: string; description?: string } {
        return this.definitionObject["$documentation"];
    }

    public get isLeaf() : boolean {
        return this.definitionObject["$type"]?.startsWith("xs:");
    }

    public get isDeprecated() : boolean {
        return this.definitionObject["$deprecated"] === true;
    }

    public get candidates(): XSDElement[] {
        const children = Object.entries(this.definitionObject).filter(entry => !entry[0].startsWith("$"));
        return children.map(c => new XSDElement(c[1], `${this.nodePath}.${c[0]}`));
    }


    public get markdownString() : MarkdownString {
        const {version, description } = this.documentation;
        let content = "";
        if (description) {
            content += description;
        }
        if (version) {
            content += "\n";
            content += `Version: ${version}`
        }

        const mdString = new MarkdownString(content);
        mdString.supportHtml = true;
        return mdString;
    }
}
