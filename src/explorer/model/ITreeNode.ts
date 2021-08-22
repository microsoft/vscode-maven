// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ITreeItem } from "./ITreeItem";

export interface ITreeNode {
    children: ITreeNode[];
    parent?: ITreeNode | ITreeItem | undefined;
    root?: ITreeNode | undefined;

    addChild(node: ITreeNode): void;

}
