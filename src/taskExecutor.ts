// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Disposable } from "vscode";

export class Queue<T> {
    private _store: T[] = [];
    public push(val: T): void {
        this._store.push(val);
    }
    public pop(): T | undefined {
        return this._store.shift();
    }
    public empty(): boolean {
        if (this._store.length === 0) {
            return true;
        }
        return false;
    }
}

class TaskExecutor implements Disposable {
    private _tasks: Queue<CallableFunction> = new Queue();
    private _isExecuting = false;

    public execute(task: CallableFunction): void {
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
        const currentTask: CallableFunction | undefined = this._tasks.pop();
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
