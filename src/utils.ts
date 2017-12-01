import { exec, execSync } from "child_process";
import * as fs from "fs";
import { existsSync } from "fs";
import * as http from "http";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as xml2js from "xml2js";
import { Archetype } from "./Archetype";
import { ProjectItem } from "./ProjectItem";

export class Utils {
    public static exec(cmd: string, callback?) {
        return exec(cmd, callback);
    }
    public static getProject(pomXmlFilePath: string): ProjectItem {
        if (fs.existsSync(pomXmlFilePath)) {
            const xml = fs.readFileSync(pomXmlFilePath, "utf8");
            let pomObject = null;
            xml2js.parseString(xml, { explicitArray: false }, (err, res) => { pomObject = res; });
            if (pomObject && pomObject.project) {
                const { artifactId } = pomObject.project;
                return new ProjectItem(artifactId,
                    pomXmlFilePath, "mavenProject", { artifactId, pom: pomObject });
            }
        }
        return null;
    }

    public static withLRUItemAhead<T>(array: T[], LRUItem: T): T[] {
        const ret = array.filter((elem) => elem !== LRUItem).reverse();
        ret.push(LRUItem);
        return ret.reverse();
    }

    public static loadCmdHistory(pomXmlFilePath: string): string[] {
        const filepath = this.getCommandHistoryCachePath(pomXmlFilePath);
        if (fs.existsSync(filepath)) {
            const content = fs.readFileSync(filepath).toString().trim();
            if (content) {
                return content.split("\n");
            }
        }
        return [];
    }

    public static saveCmdHistory(pomXmlFilePath: string, cmdlist: string[]): void {
        const filepath = this.getCommandHistoryCachePath(pomXmlFilePath);
        Utils.mkdirp(path.dirname(filepath));
        fs.writeFileSync(filepath, cmdlist.join("\n"));
    }

    public static getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), "vscode-maven", md5(pomXmlFilePath), "effective-pom.xml");
    }

    public static getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), "vscode-maven", md5(pomXmlFilePath), "commandHistory.txt");
    }

    public static getArchetypeList(): Archetype[] {
        const localArchetypeXmlFilePath = this.getLocalArchetypeCatalogFilePath();
        if (existsSync(localArchetypeXmlFilePath)) {
            const xml = fs.readFileSync(localArchetypeXmlFilePath, "utf8");
            let catalog = null;
            xml2js.parseString(xml, { explicitArray: false }, (err, res) => { catalog = res; });
            if (catalog && catalog["archetype-catalog"] && catalog["archetype-catalog"].archetypes) {
                const dict: { [key: string]: Archetype } = {};
                catalog["archetype-catalog"].archetypes.archetype.forEach((archetype) => {
                    const identifier = `${archetype.groupId}:${archetype.artifactId}`;
                    if (!dict[identifier]) {
                        dict[identifier] =
                            new Archetype(archetype.artifactId, archetype.groupId, archetype.description);
                    }
                    if (dict[identifier].versions.indexOf(archetype.version) < 0) {
                        dict[identifier].versions.push(archetype.version);
                    }
                });
                return Object.keys(dict).map((k) => dict[k]);
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
        const ret = new Promise<void>((resolve, reject) => {
            const request = http.get(url, (response) => {
                response.pipe(file);
                response.on("end", () => {
                    resolve();
                });
            });
            request.on("error", (e) => {
                reject();
            });
        });
        return ret;
    }

    public static readFileIfExists(filepath: string): string {
        if (filepath && fs.existsSync(filepath)) {
            return fs.readFileSync(filepath).toString();
        }
        return null;
    }

    public static nearestDirPath(filepath: string): string {
        if (fs.existsSync(filepath)) {
            const stat = fs.lstatSync(filepath);
            if (stat.isDirectory()) {
                return filepath;
            } else if (stat.isFile) {
                return path.dirname(filepath);
            }
        }
    }

    private static mkdirp(filepath) {
        if (fs.existsSync(filepath)) {
            return;
        }
        this.mkdirp(path.dirname(filepath));
        fs.mkdirSync(filepath);
    }
}
