// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export class TreeNode {
    public value: string;
    public children: TreeNode[] = [];
    public parent?: TreeNode | undefined;

    constructor(value: string) {
        this.value = value;
    }

    public addChildValue(value: string): void {
        const child = new TreeNode(value);
        child.parent = this;
        this.children.push(child);
    }

    public addChildNode(node: TreeNode): void {
        node.parent = this;
        this.children.push(node);
    }
}
