import * as vscode from "vscode";
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as xmlParser from 'xml-parser';

export class Utils {
    private static terminals: { [id: string]: vscode.Terminal } = {};

    public static runInTerminal(command: string, addNewLine: boolean = true, terminal: string = "Maven"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        this.terminals[terminal].sendText(command, addNewLine);
    }

    public static getPomXmlFilePaths(): string[] {
        const filename: string = 'pom.xml';
        const ret = [];
        const stdout = execSync(`find ${vscode.workspace.rootPath} -name '${filename}'`);
        stdout.toString().split('\n').forEach(f => {
            if (f) {
                ret.push(f);
            }
        })
        return ret;
    }

    static getProjectName(pomXmlFilePath: string): string {
        const xml = fs.readFileSync(pomXmlFilePath, 'utf8');
        let ret = `Location: ${pomXmlFilePath}`;
        xmlParser(xml).root.children.forEach(entry => {
            if (entry.name == 'name') {
                ret = entry.content;
            }
        })
        return ret;
    }
}