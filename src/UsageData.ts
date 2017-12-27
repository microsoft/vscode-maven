import * as vscode from "vscode";
import TelemetryReporter from "vscode-extension-telemetry";

export module UsageData {
    let reporter: TelemetryReporter;
    export function initilize(publisher: string, name: string, version: string, aiKey: string): void {
        if (reporter) {
            throw new Error("TelemetryReporter already initilized.");
        }
        reporter = new TelemetryReporter(`${publisher}.${name}`, version, aiKey);
        report(EventType.ACTIVATION);
    }

    export function registerCommand(context: vscode.ExtensionContext, command: string, callback: (...args: {}[]) => any, _thisArg?: any): void {
        context.subscriptions.push(vscode.commands.registerCommand(command, (param: {}[]) => {
            report(EventType.COMMAND, {properties: {command}});
            try {
                callback(param);
            } catch (error) {
                report(EventType.ERROR, {properties: {command, error}});
                throw error;
            }
        }));
    }

    export function reportError(error: Error|string): void {
        report(EventType.ERROR, {properties: {error: error && error.toString()}});
    }

    function isEnabled(): boolean {
        return vscode.workspace.getConfiguration("maven").get<boolean>("enableStatistics");
    }

    export function startTransaction(name: string): Transaction {
        const trans: Transaction = new Transaction(name);
        trans.startAt = new Date();
        return trans;
    }

    export function report(eventType: EventType, event?: ICustomEvent): void {
        if (reporter && isEnabled()) {
            reporter.sendTelemetryEvent(`${eventType}`, event && event.properties, event && event.measures);
        }
    }

    export function reportTransaction(transaction: Transaction): void {
        const event: ICustomEvent = transaction.getCustomEvent();
        report(EventType.TRANSACTION, event);
    }

    export class Transaction {
        public name: string;
        public startAt: Date;
        public stopAt: Date;
        public success: boolean;

        private customMeasures?: { [key: string]: ICustomMeasure } = {};
        private customProperties?: { [key: string]: {} } = {};

        constructor(name: string) {
            this.name = name;
            this.success = false;
        }

        public getCustomEvent(): ICustomEvent {
            const ret: ICustomEvent = {};
            ret.measures = Object.assign(
                {},
                ...Object.keys(this.customMeasures).map((k: string) => ({ [k]: this.customMeasures[k].reduceFunc(this.customMeasures[k].observes) })),
                { duration: this.stopAt.getTime() - this.startAt.getTime() }
            );
            ret.properties = Object.assign({}, this.customProperties, { name: this.name, startAt: this.startAt, stopAt: this.stopAt, success: this.success });
            return ret;
        }

        public initMeasure<T>(key: string, reduceFunc: (observes: T[]) => number): void {
            if (!this.customMeasures[key]) {
                this.customMeasures[key] = { observes: [], reduceFunc };
            }
        }

        public observeMeasure<T>(key: string, observe: T): void {
            if (this.customMeasures[key]) {
                this.customMeasures[key].observes.push(observe);
            }
        }

        public complete(success: boolean): void {
            this.success = success;
            this.stopAt = new Date();
            reportTransaction(this);
        }
    }
    interface ICustomMeasure {
        observes: {}[];
        reduceFunc(observes: {}[]): number;
    }
    enum EventType {
        ACTIVATION = "activation",
        ERROR = "error",
        TRANSACTION = "transaction",
        EVENT = "event",
        COMMAND = "command"
    }
}

interface ICustomEvent {
    properties?: {};
    measures?: {};
}
