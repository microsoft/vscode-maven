import * as fs from "fs";
import { Uri, window } from "vscode";
import { Archetype } from "./Archetype";
import { Utils } from "./Utils";
import { VSCodeUI } from "./VSCodeUI";

// tslint:disable-next-line:no-http-string
const DEFAULT_ARCHETYPE_CATALOG_URL: string = "http://repo.maven.apache.org/maven2/archetype-catalog.xml";

export namespace ArchetypeModule {

    export async function generateFromArchetype(entry: Uri | undefined): Promise<void> {
        let cwd: string = null;
        const result: Uri = await VSCodeUI.openDialogForFolder({
            defaultUri: entry && entry.fsPath ? Uri.file(entry.fsPath) : undefined,
            openLabel: "Select Destination Folder"
        });
        if (result && result.fsPath) {
            cwd = result.fsPath;
        } else {
            return Promise.resolve();
        }

        const selectedCatalog: string = await window.showQuickPick(
            ["Remote", "Local"],
            { placeHolder: "Choose archetype catalog ... " }
        );
        if (!selectedCatalog) {
            return Promise.resolve();
        }
        const catalogUrl: string = selectedCatalog === "Remote" ? DEFAULT_ARCHETYPE_CATALOG_URL : null;
        const selectedArchetype: Archetype = await window.showQuickPick(
            getArchetypeList(catalogUrl),
            { matchOnDescription: true, placeHolder: "Select archetype with <groupId>:<artifactId> ..." }
        );
        if (selectedArchetype) {
            const { artifactId, groupId, versions } = selectedArchetype;
            const version: string = await window.showQuickPick(
                Promise.resolve(versions),
                { placeHolder: "Select version ..." }
            );
            if (version) {
                const cmd: string = ["mvn archetype:generate",
                    `-DarchetypeArtifactId="${artifactId}"`,
                    `-DarchetypeGroupId="${groupId}"`,
                    `-DarchetypeVersion="${version}"`].join(" ");
                VSCodeUI.runInTerminal(cmd, { cwd, name: "Maven-Archetype" });
            }
        }
    }

    async function getArchetypeList(url?: string): Promise<Archetype[]> {
        let xml: string = null;
        if (url) {
            xml = await Utils.httpGetContent(url);
        } else {
            const localArchetypeXmlFilePath: string = Utils.getLocalArchetypeCatalogFilePath();
            if (fs.existsSync(localArchetypeXmlFilePath)) {
                xml = fs.readFileSync(localArchetypeXmlFilePath, "utf8");
            }
        }
        if (xml) {
            return Promise.resolve(Utils.listArchetypeFromXml(xml));
        }
        return Promise.resolve([]);
    }
}
