// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Dependency } from "../explorer/model/Dependency";
import { MavenProject } from "../explorer/model/MavenProject";
import { getDependencyTree } from "../handlers/showDependenciesHandler";

export async function parseRawDependencyDataHandler(project: MavenProject): Promise<Dependency[]> {
    const dependencyTree: string | undefined = await getDependencyTree(project.pomPath);
    if (dependencyTree === undefined) {
        throw new Error("Failed to generate dependency tree.");
    }
    let treeContent: string = dependencyTree.slice(0, -1); // delete last "\n"
    treeContent = treeContent.replace(/\|/g, " ");
    treeContent = treeContent.replace(/\\/g, "+");
    treeContent = treeContent.replace(/\n/g, "\r\n");
    // handle the version switch in conflict
    // input = (groupId:artifactId:)(version1)(:scope (omitted for conflict): (version2))
    // output = (groupId:artifactId:)(version2)(:scope (omitted for conflict) with (version1))
    const re = /([\w.]+:[\w.-]+:)([\w.-]+)(:[\w/.(\s]+):\s([\w.-]+)\)/gm;
    treeContent = treeContent.replace(re, "$1$4$3 with $2)");

    const indent: string = "   "; // three spaces
    const eol: string = "\r\n";
    const prefix: string = "+- ";
    return parseTreeNodes(treeContent, eol, indent, prefix, project.pomPath);
}

function parseTreeNodes(treecontent: string, eol: string, indent: string, prefix: string, projectPomPath: string): Dependency[] {
    const treeNodes: Dependency[] = [];
    if (treecontent) {
        let curNode: Dependency;
        let preNode: Dependency;
        let parentNode: Dependency;
        let rootNode: Dependency;
        let curIndentCnt: number;
        let preIndentCnt: number;
        const lines: string[] = treecontent.split(eol).splice(1); // delete project name
        const toDependency = (line: string): Dependency => {
            let name: string = line.slice(curIndentCnt + prefix.length);
            const indexCut: number = name.indexOf("(");
            let supplement: string = "";
            if (indexCut !== -1) {
                supplement = name.substr(indexCut);
                name = name.substr(0, indexCut);
            }
            const [gid, aid, version, scope] = name.split(":");
            return new Dependency(gid, aid, version, scope, supplement, projectPomPath);
        };
        lines.forEach(line => {
            curIndentCnt = line.indexOf(prefix);
            curNode = toDependency(line);
            if (curIndentCnt === 0) {
                curNode.root = curNode;
                rootNode = curNode;
                parentNode = curNode;
            } else {
                curNode.root = rootNode;
                if (curIndentCnt === preIndentCnt) {
                    parentNode.addChild(curNode);
                } else if (curIndentCnt > preIndentCnt) {
                    parentNode = preNode;
                    parentNode.addChild(curNode);
                } else {
                    const level: number = (preIndentCnt - curIndentCnt) / indent.length;
                    for (let i = level; i > 0; i -= 1) {
                        parentNode = <Dependency> parentNode.parent;
                    }
                    parentNode.addChild(curNode);
                }
            }
            if (curIndentCnt === 0) {
                treeNodes.push(rootNode);
            }
            preIndentCnt = curIndentCnt;
            preNode = curNode;
        });
    }
    return treeNodes;
}
