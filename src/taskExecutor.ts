// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from "vscode";

class Queue<T> {
    private _store: T[] = [];
    public push(val: T): void {
        this._store.push(val);
    }
    public pop(): T | undefined {
        return this._store.shift();
    }
}

class TaskExecutor implements Disposable {
    private _tasks: Queue<any> = new Queue();
    private _isExecuting: boolean = false;

    public execute(task: any): void {
        this._tasks.push(task);
        this._pickAndRun().catch(console.error);
    }

    public dispose(): void {
        // do nothing
    }

    private async _pickAndRun(): Promise<void> {
        if (this._isExecuting) {
            return;
        }
        this._isExecuting = true;
        const currentTask: any = this._tasks.pop();
        if (!currentTask) {
            this._isExecuting = false;
            return;
        }
        try {
            await currentTask();
        } catch (error) {
            // ignore.
        }
        this._isExecuting = false;
        this._pickAndRun().catch(console.error);
    }
}

export const taskExecutor: TaskExecutor = new TaskExecutor();
