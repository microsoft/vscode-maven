export interface ICommandHistory {
    pomPath: string;
    history: { command: string, timestamp: number }[];
}
