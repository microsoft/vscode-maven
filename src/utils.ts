import * as vscode from "vscode";
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as md5 from "md5";
import * as path from 'path';
import * as xml2js from 'xml2js';
import { MavenProjectTreeItem } from "./mavenProjectTreeItem";
import { MavenArchetype } from "./mavenArchetype";
import { existsSync } from "fs";



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

    public static loadCmdHistory(pomXmlFilePath: string): string[] {
        const filepath = this.getCommandHistoryCachePath(pomXmlFilePath);
        if (fs.existsSync(filepath)) {
            const content = fs.readFileSync(filepath).toString().trim();
            if (content) {
                return content.split('\n');
            }
        }
        return [];
    }

    public static saveCmdHistory(pomXmlFilePath: string, cmdlist: string[]): void {
        const filepath = this.getCommandHistoryCachePath(pomXmlFilePath);
        Utils.mkdirp(path.dirname(filepath));
        fs.writeFileSync(filepath, cmdlist.join('\n'));
    }

    public static getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), "vscode-maven", md5(pomXmlFilePath), 'effective-pom.xml');
    }

    public static getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), "vscode-maven", md5(pomXmlFilePath), 'commandHistory.txt');
    }

    static getArchetypeList(): MavenArchetype[] {
        const localArchetypeXmlFilePath = this.getLocalArchetypeCatalogFilePath();
        if (existsSync(localArchetypeXmlFilePath)) {
            const xml = fs.readFileSync(localArchetypeXmlFilePath, 'utf8');
            let catalog = null;
            xml2js.parseString(xml, { explicitArray: false }, (err, res) => { catalog = res; });
            if (catalog && catalog['archetype-catalog'] && catalog['archetype-catalog'].archetypes) {
                let dict: { [key: string]: MavenArchetype } = {};
                catalog['archetype-catalog'].archetypes.archetype.forEach(archetype => {
                    const identifier = `${archetype.groupId}:${archetype.artifactId}`;
                    if (!dict[identifier]) {
                        dict[identifier] = new MavenArchetype(archetype.artifactId, archetype.groupId, archetype.description);
                    }
                    if (dict[identifier].versions.indexOf(archetype.version) < 0) {
                        dict[identifier].versions.push(archetype.version);
                    }
                });
                return Object.keys(dict).map(k => dict[k]);
            }
        }
        return [];
    }
    public static getLocalArchetypeCatalogFilePath(): string {
        return path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
    }

    public static updateArchetypeCache(url: string): Promise<void> {
        const filepath = this.getLocalArchetypeCatalogFilePath();
        this.mkdirp(path.dirname(filepath));
        const file = fs.createWriteStream(filepath);
        let ret = new Promise<void>((resolve, reject) => {
            const request = http.get(url, (response) => {
                response.pipe(file);
                response.on("end", () => {
                    resolve();
                });
            });
            request.on("error", e => {
                reject();
            });
        });
        return ret;
    }

    private static mkdirp(filepath) {
        if (fs.existsSync(filepath)) {
            return;
        }
        this.mkdirp(path.dirname(filepath));
        fs.mkdirSync(filepath);
    }
}