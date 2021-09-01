// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { mavenExplorerProvider } from "../explorer/mavenExplorerProvider";
import { Dependency } from "../explorer/model/Dependency";
import { ITreeItem } from "../explorer/model/ITreeItem";
import { MavenProject } from "../explorer/model/MavenProject";
import { Queue } from "../taskExecutor";

export async function goToEffectiveHandler(view: vscode.TreeView<ITreeItem>, node?: Dependency): Promise<void> {
    if (node === undefined || node.omittedStatus === undefined) {
        throw new Error("No conflict dependency node specified.");
    }
    const fullArtifactName: string = [node.groupId, node.artifactId, node.omittedStatus.effectiveVersion, node.scope].join(":");
    const pomPath: string = node.projectPomPath;
    const project: MavenProject | undefined = mavenExplorerProvider.getMavenProject(pomPath);
    if (project === undefined) {
        throw new Error("Failed to find maven projects.");
    }

    const dependencyNodes = project.dependencyNodes;
    const treeItem: Dependency | undefined = await searchFirstEffective(dependencyNodes, fullArtifactName);
    if (treeItem === undefined) {
        throw new Error("Failed to find dependency.");
    }
    view.reveal(treeItem, { focus: true});

}

async function searchFirstEffective(dependencyNodes: Dependency[], fullArtifactName: string): Promise<Dependency | undefined> {
    let targetItem: Dependency | undefined;
    const queue: Queue<Dependency> = new Queue();
    for (const child of dependencyNodes) {
        queue.push(child);
    }
    while (queue.empty() === false) {
        const node: Dependency | undefined = queue.pop();
        if (node === undefined) {
            throw new Error("Failed to find dependency.");
        }
        if (node.fullArtifactName === fullArtifactName) {
            targetItem = node;
            break;
        }
        const children = <Dependency[]> node.children;
        for (const child of children) {
            queue.push(child);
        }
    }
    return targetItem;
}
