// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class TreeNode {
    protected value: string;
    public children: TreeNode[] = [];
    public parent?: TreeNode | undefined;
    public root?: TreeNode | undefined;
    constructor(value: string) {
        this.value = value;
    }

    public addChild(valueOrNode: string | TreeNode): void {
        let child: TreeNode;
        if (typeof valueOrNode === "string") {
            child = new TreeNode(valueOrNode);
        } else {
            child = valueOrNode;
        }
        child.parent = this;
        this.children.push(child);
    }

    public addChildren(nodes: TreeNode[]): void {
        nodes.forEach(node => node.parent = this);
        this.children = this.children.concat(nodes);
    }
}
