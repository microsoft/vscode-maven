import * as vscode from "vscode";
import { Utils } from "./utils";
import { VSCodeUI } from "./vscodeUI";
import { Archetype } from "./Archetype";
import * as fs from "fs";
const DEFAULT_ARCHETYPE_CATALOG_URL: string = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";

export class ArchetypeModule {
    public static async generateFromArchetype(entry): Promise<void> {
        let cwd: string = null;
        const result = await VSCodeUI.openDialogForFolder({ openLabel: "Select Destination Folder", defaultUri: entry && entry.fsPath ? vscode.Uri.file(entry.fsPath) : undefined });
        if (result && result.fsPath) {
            cwd = result.fsPath;
        } else {
            return Promise.resolve();
        }

        const selectedCatalog = await vscode.window.showQuickPick(["Remote", "Local"], {placeHolder: "Choose archetype catalog ... "});
        if (!selectedCatalog) {
            return Promise.resolve();
        }
        const catalogUrl = selectedCatalog === "Remote" ? DEFAULT_ARCHETYPE_CATALOG_URL : null;
        const selectedArchetype = await vscode.window.showQuickPick(this.getArchetypeList(catalogUrl),
            { matchOnDescription: true, placeHolder: "Select archetype with <groupId>:<artifactId> ..." });
        if (selectedArchetype) {
            const { artifactId, groupId, versions } = selectedArchetype;
            const version = await vscode.window.showQuickPick(Promise.resolve(versions), {placeHolder: "Select version ..."});
            if (version) {
                const cmd = ["mvn archetype:generate",
                    `-DarchetypeArtifactId="${artifactId}"`,
                    `-DarchetypeGroupId="${groupId}"`,
                    `-DarchetypeVersion="${version}"`].join(" ");
                VSCodeUI.runInTerminal(cmd, { cwd, name: "Maven-Archetype" });
            }
        }
    }

    public static async getArchetypeList(url?: string): Promise<Archetype[]> {
        let xml = null;
        if (url) {
            xml = await Utils.httpGetContent(url);
        } else {
            const localArchetypeXmlFilePath = Utils.getLocalArchetypeCatalogFilePath();
            if (fs.existsSync(localArchetypeXmlFilePath)) {
                xml = fs.readFileSync(localArchetypeXmlFilePath, "utf8");
            }
        }
        if (xml) {
            return Promise.resolve(Utils.listArchetypeFromXml(xml))
        }
        return Promise.resolve([]);
    }
}