// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class TreeNode {
    public children: TreeNode[] = [];
    public parent?: TreeNode | undefined;
    public root?: TreeNode | undefined;

    public addChild(node: TreeNode): void {
        node.parent = this;
        this.children.push(node);
    }

    public addChildren(nodes: TreeNode[]): void {
        nodes.forEach(node => node.parent = this);
        this.children = this.children.concat(nodes);
    }
}
