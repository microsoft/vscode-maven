import { exec, execSync } from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as md5 from "md5";
import * as os from "os";
import * as path from "path";
import * as xml2js from "xml2js";
import { Archetype } from "./Archetype";
import { ProjectItem } from "./model/ProjectItem";
import { IArchetype, IArchetypeCatalogRoot, IArchetypes, IPomRoot } from "./model/XmlSchema";

const EXTENSION_ID: string = "vscode-maven";

export namespace Utils {
    export async function getProject(absolutePath: string, workspacePath: string, iconPath?: string): Promise<ProjectItem> {
        if (fs.existsSync(absolutePath)) {
            const xml: string = fs.readFileSync(absolutePath, "utf8");
            const pom: IPomRoot = await readXmlContent(xml);
            if (pom && pom.project && pom.project.artifactId) {
                const artifactId: string = pom.project.artifactId.toString();
                const ret: ProjectItem = new ProjectItem(artifactId, workspacePath, absolutePath, { pom });
                ret.collapsibleState = pom.project && pom.project.modules ? 1 : 0;
                if (iconPath) {
                    ret.iconPath = iconPath;
                }
                return Promise.resolve(ret);
            }
        }
        return Promise.resolve(null);
    }

    export async function readXmlContent(xml: string, options?: {}): Promise<{}> {
        const opts: {} = Object.assign({ explicitArray: true }, options);
        return new Promise<{}>(
            (resolve: (value: {}) => void, reject: (e: Error) => void): void => {
                xml2js.parseString(xml, opts, (err: Error, res: {}) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                });
            }
        );
    }

    export function withLRUItemAhead<T>(array: T[], lruItem: T): T[] {
        const ret: T[] = array.filter((elem: T) => elem !== lruItem).reverse();
        ret.push(lruItem);
        return ret.reverse();
    }

    export function loadCmdHistory(pomXmlFilePath: string): string[] {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        if (fs.existsSync(filepath)) {
            const content: string = fs.readFileSync(filepath).toString().trim();
            if (content) {
                return content.split("\n");
            }
        }
        return [];
    }

    export function saveCmdHistory(pomXmlFilePath: string, cmdlist: string[]): void {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        mkdirp(path.dirname(filepath));
        fs.writeFileSync(filepath, cmdlist.join("\n"));
    }

    export function getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_ID, md5(pomXmlFilePath), "effective-pom.xml");
    }

    export function getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_ID, md5(pomXmlFilePath), "commandHistory.txt");
    }

    export function getTempFolder(): string {
        return path.join(os.tmpdir(), EXTENSION_ID);
    }

    export function readFileIfExists(filepath: string): string {
        if (filepath && fs.existsSync(filepath)) {
            return fs.readFileSync(filepath).toString();
        }
        return null;
    }

    export function nearestDirPath(filepath: string): string {
        if (fs.existsSync(filepath)) {
            const stat: fs.Stats = fs.lstatSync(filepath);
            if (stat.isDirectory()) {
                return filepath;
            } else if (stat.isFile) {
                return path.dirname(filepath);
            }
        }
    }

    export function mkdirp(filepath: string): void {
        if (fs.existsSync(filepath)) {
            return;
        }
        mkdirp(path.dirname(filepath));
        fs.mkdirSync(filepath);
    }

    export async function listArchetypeFromXml(xml: string): Promise<Archetype[]> {
        const catalogRoot: IArchetypeCatalogRoot = await readXmlContent(xml);
        if (catalogRoot && catalogRoot["archetype-catalog"]) {
            const dict: { [key: string]: Archetype } = {};
            catalogRoot["archetype-catalog"].archetypes.forEach((archetypes: IArchetypes) => {
                archetypes.archetype.forEach((archetype: IArchetype) => {
                    const groupId: string = archetype.groupId && archetype.groupId.toString();
                    const artifactId: string = archetype.artifactId && archetype.artifactId.toString();
                    const description: string = archetype.description && archetype.description.toString();
                    const version: string = archetype.version && archetype.version.toString();
                    const identifier: string = `${groupId}:${artifactId}`;
                    if (!dict[identifier]) {
                        dict[identifier] =
                            new Archetype(artifactId, groupId, description);
                    }
                    if (dict[identifier].versions.indexOf(version) < 0) {
                        dict[identifier].versions.push(version);
                    }
                });
            });
            return Promise.resolve(Object.keys(dict).map((k: string) => dict[k]));
        }
        Promise.resolve([]);
    }

    export function getLocalArchetypeCatalogFilePath(): string {
        return path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
    }

    export function httpGetContent(url: string): Promise<string> {
        const filepath: string = path.join(getTempFolder(), md5(url));
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
        mkdirp(path.dirname(filepath));
        const file: fs.WriteStream = fs.createWriteStream(filepath);
        const contentBlocks: string[] = [];
        return new Promise<string>(
            (resolve: (value: string) => void, reject: (e: Error) => void): void => {
                const request: http.ClientRequest = http.get(url, (response: http.IncomingMessage) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve(fs.readFileSync(filepath).toString());
                    });
                });
                request.on("error", (e: Error) => {
                    reject(e);
                });
            });
    }

    export function findAllInDir(dirname: string, targetFileName: string, depth: number): string[] {
        const ret: string[] = [];
        // `depth < 0` means infinite
        if (depth !== 0 && fs.existsSync(dirname)) {
            const filenames: string[] = fs.readdirSync(dirname);
            filenames.forEach((filename: string) => {
                const filepath: string = path.join(dirname, filename);
                const stat: fs.Stats = fs.lstatSync(filepath);
                if (stat.isDirectory()) {
                    findAllInDir(filepath, targetFileName, depth - 1).forEach((elem: string) => {
                        ret.push(elem);
                    });
                } else if (path.basename(filepath).toLowerCase() === targetFileName) {
                    ret.push(filepath);
                }
            });
        }
        return ret;
    }
}
