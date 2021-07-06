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

    const eol: string = "\r\n";
    const indent: string = "   "; // three spaces
    const separator: string = "\r\n";
    const starter: string = "+- ";
    return parseTreeNodes(treeContent, separator, indent, starter, eol);
}

function parseTreeNodes(treecontent: string, separator: string, indent: string, starter: string, eol: string): Dependency[] {
    const treeNodes: Dependency[] = [];
    if (treecontent) {
        const treeChildren: string[] = treecontent.split(`${separator}${starter}`).splice(1); // delete first line
        const toTreeNode = (treeChild: string): Dependency => {
            let curNode: Dependency;
            if (treeChild.indexOf(eol) === -1) {
                curNode = new Dependency(treeChild);
            } else {
                const curValue: string = treeChild.split(separator, 1)[0];
                curNode = new Dependency(curValue);
                const nextSeparator = `${separator}${indent}`;
                const childrenNodes: Dependency[] = parseTreeNodes(treeChild, nextSeparator, indent, starter, eol);
                curNode.addChildren(childrenNodes);
            }
            return curNode;
        };
        treeChildren.forEach(treeChild => treeNodes.push(toTreeNode(treeChild)));
    }
    return treeNodes;
}
