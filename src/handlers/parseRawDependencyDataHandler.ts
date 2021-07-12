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
    const separator: string = "\r\n";
    const starter: string = "+- ";
    return parseTreeNodes(treeContent, separator, indent, starter, project.pomPath);
}

function parseTreeNodes(treecontent: string, separator: string, indent: string, starter: string, projectPomPath: string): Dependency[] {
    const treeNodes: Dependency[] = [];
    if (treecontent) {
        let curNode: Dependency;
        let preNode: Dependency;
        let parentNode: Dependency;
        let rootNode: Dependency;
        let curIndex: number;
        let preIndex: number = 1;
        const treeChildren: string[] = treecontent.split(separator).splice(1); // delete first line
        treeChildren.forEach(treeChild => {
            curIndex = treeChild.indexOf(starter);
            const label: string = treeChild.slice(curIndex + starter.length);
            curNode = new Dependency(label, projectPomPath);
            if (curIndex === 0) {
                curNode.root = curNode;
                rootNode = curNode;
                parentNode = curNode;
            } else {
                curNode.root = rootNode;
                if (curIndex === preIndex) {
                    parentNode.addChild(curNode);
                } else if (curIndex > preIndex) {
                    parentNode = preNode;
                    parentNode.addChild(curNode);
                } else {
                    const level: number = (preIndex - curIndex) / indent.length;
                    for (let i = level; i > 0; i -= 1) {
                        parentNode = <Dependency> parentNode.parent;
                    }
                    parentNode.addChild(curNode);
                }
            }
            if (curIndex === 0 && curIndex < preIndex) {
                treeNodes.push(rootNode);
            }
            preIndex = curIndex === 0 ? 1 : curIndex;
            preNode = curNode;
        });
    }
    return treeNodes;
}
