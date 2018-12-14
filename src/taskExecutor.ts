class Queue<T> {
    private _store: T[] = [];
    public push(val: T): void {
        this._store.push(val);
    }
    public pop(): T | undefined {
        return this._store.shift();
    }
}

class TaskExecutor {
    private _tasks: Queue<any> = new Queue();
    private _executing: boolean = false;

    public execute(task: any): void {
        this._tasks.push(task);
        this.pickAndRun();
    }

    public async pickAndRun(): Promise<void> {
        if (this._executing) {
            return;
        }
        this._executing = true;
        const currentTask: any = this._tasks.pop();
        if (!currentTask) {
            this._executing = false;
            return;
        }
        try {
            await currentTask();
        } catch (error) {
            // ignore.
        }
        this._executing = false;
        this.pickAndRun();
    }
}

export const taskExecutor: TaskExecutor = new TaskExecutor();
