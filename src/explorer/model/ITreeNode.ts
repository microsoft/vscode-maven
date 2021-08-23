// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

export interface ITreeNode {
    children: ITreeNode[];
    parent?: ITreeNode | undefined;
    root?: ITreeNode | undefined;

    addChild(node: ITreeNode): void;

}
