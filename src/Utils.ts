import * as fs from "fs-extra";
import * as http from "http";
import * as md5 from "md5";
import * as minimatch from "minimatch";
import * as os from "os";
import * as path from "path";
import { extensions, workspace } from 'vscode';
import * as xml2js from "xml2js";
import { Archetype } from "./model/Archetype";
import { ProjectItem } from "./model/ProjectItem";
import { IArchetype, IArchetypeCatalogRoot, IArchetypes, IPomRoot } from "./model/XmlSchema";
const EXTENSION_NAME: string = "vscode-maven";
const EXTENSION_ID: string = "eskibear.vscode-maven";

export namespace Utils {
    export async function getProject(absolutePath: string, workspacePath: string, iconPath?: string): Promise<ProjectItem> {
        if (await fs.pathExists(absolutePath)) {
            const xml: string = await fs.readFile(absolutePath, "utf8");
            const pom: IPomRoot = await readXmlContent(xml);
            if (pom && pom.project && pom.project.artifactId) {
                const artifactId: string = pom.project.artifactId.toString();
                const ret: ProjectItem = new ProjectItem(artifactId, workspacePath, absolutePath, { pom });
                ret.collapsibleState = pom.project && pom.project.modules ? 1 : 0;
                if (iconPath) {
                    ret.iconPath = iconPath;
                }
                return ret;
            }
        }
        return null;
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

    export async function loadCmdHistory(pomXmlFilePath: string): Promise<string[]> {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        if (await fs.pathExists(filepath)) {
            const content: string = (await fs.readFile(filepath)).toString().trim();
            if (content) {
                return content.split("\n");
            }
        }
        return [];
    }

    export async function saveCmdHistory(pomXmlFilePath: string, cmdlist: string[]): Promise<void> {
        const filepath: string = getCommandHistoryCachePath(pomXmlFilePath);
        await fs.ensureFile(filepath);
        await fs.writeFile(filepath, cmdlist.join("\n"));
    }

    export function getEffectivePomOutputPath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "effective-pom.xml");
    }

    export function getCommandHistoryCachePath(pomXmlFilePath: string): string {
        return path.join(os.tmpdir(), EXTENSION_NAME, md5(pomXmlFilePath), "commandHistory.txt");
    }

    export function getTempFolder(): string {
        return path.join(os.tmpdir(), EXTENSION_NAME);
    }

    export async function readFileIfExists(filepath: string): Promise<string> {
        if (await fs.pathExists(filepath)) {
            return (await fs.readFile(filepath)).toString();
        }
        return null;
    }

    export async function listArchetypeFromXml(xml: string): Promise<Archetype[]> {
        try {
            const catalogRoot: IArchetypeCatalogRoot = await readXmlContent(xml);
            if (catalogRoot && catalogRoot["archetype-catalog"]) {
                const dict: { [key: string]: Archetype } = {};
                catalogRoot["archetype-catalog"].archetypes.forEach((archetypes: IArchetypes) => {
                    archetypes.archetype.forEach((archetype: IArchetype) => {
                        const groupId: string = archetype.groupId && archetype.groupId.toString();
                        const artifactId: string = archetype.artifactId && archetype.artifactId.toString();
                        const description: string = archetype.description && archetype.description.toString();
                        const version: string = archetype.version && archetype.version.toString();
                        const repository: string = archetype.repository && archetype.repository.toString();
                        const identifier: string = `${groupId}:${artifactId}`;
                        if (!dict[identifier]) {
                            dict[identifier] =
                                new Archetype(artifactId, groupId, repository, description);
                        }
                        if (dict[identifier].versions.indexOf(version) < 0) {
                            dict[identifier].versions.push(version);
                        }
                    });
                });
                return Object.keys(dict).map((k: string) => dict[k]);
            }
        } catch (err) {
            // do nothing
        }
        return [];
     }

    export function getLocalArchetypeCatalogFilePath(): string {
        return path.join(os.homedir(), ".m2", "repository", "archetype-catalog.xml");
    }

    export function getProvidedArchetypeCatalogFilePath(): string {
        return path.join(Utils.getExtensionRootPath(), "resources", "archetype-catalog.xml");
    }

    export async function httpGetContent(url: string): Promise<string> {
        const filepath: string = path.join(getTempFolder(), md5(url));
        if (await fs.pathExists(filepath)) {
            await fs.unlink(filepath);
        }
        await fs.ensureFile(filepath);
        const file: fs.WriteStream = fs.createWriteStream(filepath);
        return new Promise<string>(
            (resolve: (value: string) => void, reject: (e: Error) => void): void => {
                const request: http.ClientRequest = http.get(url, (response: http.IncomingMessage) => {
                    response.pipe(file);
                    file.on('finish', async () => {
                        file.close();
                        const buf: Buffer = await fs.readFile(filepath);
                        resolve(buf.toString());
                    });
                });
                request.on("error", (e: Error) => {
                    reject(e);
                });
            });
    }

    export async function findAllInDir(currentPath: string, targetFileName: string, depth: number, exclusion: string[] = ["**/.*"]): Promise<string[]> {
        if (exclusion) {
            for (const pattern of exclusion) {
                if (minimatch(currentPath, pattern)) {
                    return [];
                }
            }
        }
        const ret: string[] = [];
        // `depth < 0` means infinite
        if (depth !== 0 && await fs.pathExists(currentPath)) {
            const stat: fs.Stats = await fs.lstat(currentPath);
            if (stat.isDirectory()) {
                const filenames: string[] = await fs.readdir(currentPath);
                for (const filename of filenames) {
                    const filepath: string = path.join(currentPath, filename);
                    const results: string[] = await findAllInDir(filepath, targetFileName, depth - 1, exclusion);
                    for (const result of results) {
                        ret.push(result);
                    }
                }
            } else if (path.basename(currentPath).toLowerCase() === targetFileName) {
                ret.push(currentPath);
            }
        }
        return ret;
    }

    export function getExtensionRootPath(): string {
        return extensions.getExtension(EXTENSION_ID).extensionPath;
    }

    export function getMavenExecutable(): string {
        return workspace.getConfiguration("maven.executable").get<string>("path") || "mvn";
    }
}
