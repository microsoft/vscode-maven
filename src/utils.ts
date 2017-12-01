import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as xml2js from "xml2js";
import { Archetype } from "./Archetype";
import { ProjectItem } from "./ProjectItem";

const EXTENSION_ID: string = "vscode-maven";

export class Utils {
    public static exec(cmd: string, callback?) {
        return exec(cmd, callback);
    }
    public static getProject(pomXmlFilePath: string): ProjectItem {
        if (fs.existsSync(pomXmlFilePath)) {
            const xml = fs.readFileSync(pomXmlFilePath, "utf8");
            let pomObject = null;
            xml2js.parseString(xml, { explicitArray: true }, (err, res) => { pomObject = res; });
            if (pomObject && pomObject.project) {
                const artifactId = pomObject.project.artifactId && pomObject.project.artifactId.toString();
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
        return path.join(os.tmpdir(), EXTENSION_ID, md5(pomXmlFilePath), "effective-pom.xml");
    }

    public static getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_ID, md5(pomXmlFilePath), "commandHistory.txt");
    }

    public static getTempFolder(): string {
        return path.join(os.tmpdir(), EXTENSION_ID);
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

    public static mkdirp(filepath) {
        if (fs.existsSync(filepath)) {
            return;
        }
        this.mkdirp(path.dirname(filepath));
        fs.mkdirSync(filepath);
    }

    public static listArchetypeFromXml(xml: string): Archetype[] {
        let catalog = null;
        xml2js.parseString(xml, { explicitArray: true }, (err, res) => { catalog = res; });
        if (catalog && catalog["archetype-catalog"]) {
            const dict: { [key: string]: Archetype } = {};
            catalog["archetype-catalog"].archetypes.forEach((archetypes) => {
                archetypes.archetype.forEach((archetype) => {
                    const groupId = archetype.groupId && archetype.groupId.toString();
                    const artifactId = archetype.artifactId && archetype.artifactId.toString();
                    const description = archetype.description && archetype.description.toString();
                    const version = archetype.version && archetype.version.toString();
                    const identifier = `${groupId}:${artifactId}`;
                    if (!dict[identifier]) {
                        dict[identifier] =
                            new Archetype(artifactId, groupId, description);
                    }
                    if (dict[identifier].versions.indexOf(version) < 0) {
                        dict[identifier].versions.push(version);
                    }
                });
            });
            return Object.keys(dict).map((k) => dict[k]);
        }
    }

    public static getLocalArchetypeCatalogFilePath(): string {
        return path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
    }

    public static httpGetContent(url: string): Promise<string> {
        const filepath = path.join(this.getTempFolder(), md5(url));
        const file = fs.createWriteStream(filepath);
        const contentBlocks: string[] = [];
        const ret = new Promise<string>((resolve, reject) => {
            const request = http.get(url, (response) => {
                response.pipe(file);
                response.on("end", () => {
                    resolve(fs.readFileSync(filepath).toString());
                });
            });
            request.on("error", (e) => {
                reject();
            });
        });
        return ret;
    }
}
