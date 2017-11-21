import * as vscode from "vscode";
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as md5 from "md5";
import * as path from 'path';
import * as xml2js from 'xml2js';
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";


export class Utils {
    private static terminals: { [id: string]: vscode.Terminal } = {};

    public static runInTerminal(command: string, addNewLine: boolean = true, terminal: string = "Maven"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        this.terminals[terminal].sendText(command, addNewLine);
    }
    // unused.
    public static getPomXmlFilePaths(): string[] {
        const filename: string = 'pom.xml';
        const ret = [];
        const stdout = execSync(`find '${vscode.workspace.rootPath}' -name '${filename}'`);
        stdout.toString().split('\n').forEach(f => {
            if (f) {
                ret.push(f);
            }
        });
        return ret;
    }

    public static getProjects(pomXmlFilePath: string): MavenProjectTreeItem {
        if (fs.existsSync(pomXmlFilePath)) {
            execSync(`mvn help:effective-pom -f "${pomXmlFilePath}" -Doutput="${pomXmlFilePath}.effective"`);
            const xml = fs.readFileSync(`${pomXmlFilePath}.effective`, 'utf8');
            let obj = null;
            xml2js.parseString(xml, { explicitArray: false }, (err, res) => { obj = res; });
            if (obj && obj.project && obj.project.name) {
                return new MavenProjectTreeItem(obj.project.name, pomXmlFilePath);
            }
            if (obj && obj.projects && obj.projects.project) {
                const projectNames = [];
                obj.projects.project.forEach((project) => {
                    projectNames.push(project.name);
                });
                return new MavenProjectTreeItem(pomXmlFilePath, pomXmlFilePath, 'mavenProjects', projectNames);

            }
        }
        return null;
    }

    public static getProject(basePath: string, pomXmlRelativePath: string): MavenProjectTreeItem {
        const pomXmlFilePath = path.resolve(basePath, pomXmlRelativePath);
        if (fs.existsSync(pomXmlFilePath)) {
            const xml = fs.readFileSync(pomXmlFilePath, 'utf8');
            let pomObject = null;
            xml2js.parseString(xml, { explicitArray: false }, (err, res) => { pomObject = res; });
            if (pomObject && pomObject.project) {
                const { name, artifactId, groupId, version } = pomObject.project;
                return new MavenProjectTreeItem(name || `${groupId}:${artifactId}:${version}`,
                    pomXmlFilePath, "mavenProject", { projectName: name, pom: pomObject });
            }
        }
        return null;
    }

    public static withLRUItemAhead<T>(array: T[], LRUItem: T): T[] {
        const ret = [];
        array.forEach(elem => {
            if (elem !== LRUItem) {
                ret.push(elem);
            }
        });
        ret.reverse();
        ret.push(LRUItem);
        return ret.reverse();
    }

    public static loadCmdHistory(key: string): string[] {
        const filepath = path.join(os.tmpdir(), "vscode-maven", key, 'commandHistory.txt');
        if (fs.existsSync(filepath)) {
            const content = fs.readFileSync(filepath).toString().trim();
            if (content) {
                return content.split('\n');
            }
        }
        return [];
    }

    public static saveCmdHistory(key: string, cmdlist: string[]): void {
        const filepath = path.join(os.tmpdir(), "vscode-maven", key, 'commandHistory.txt');
        Utils.mkdirp(path.dirname(filepath));
        fs.writeFileSync(filepath, cmdlist.join('\n'));
    }

    private static mkdirp(filepath) {
        if (fs.existsSync(filepath)) {
            return;
        }
        Utils.mkdirp(path.dirname(filepath));
        fs.mkdirSync(filepath);
    }
}