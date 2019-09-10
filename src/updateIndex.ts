import * as fs from "fs";
import * as path from "path";
import { ProgressLocation, window } from "vscode";
import { executeJavaLanguageServerCommand } from "./jdtls/commands";
const axios = require("axios");

// tslint:disable-next-line: export-name
export async function updateIndex(extensionPath: string): Promise<void> {
    axios.defaults.timeout = 6000;
    window.withProgress({
        location: ProgressLocation.Notification,
        title: "Updating artifacts index data...",
        cancellable: true
    }, async (_progress, _token) => {
        return doUpdateIndex(extensionPath);
    });
}

async function doUpdateIndex(extensionPath: string): Promise<void> {
    const baseDir: string = extensionPath;
    const indexResourceUrl: string = "https://api.github.com/repos/microsoft/vscode-maven/contents/resources/IndexData/index";
    const artifactUsageResourceUrl: string = "https://api.github.com/repos/microsoft/vscode-maven/contents/resources/IndexData/ArtifactUsage.json";
    const indexDataFileName: string = "IndexData";
    const indexDataTmpFileName: string = "IndexData_tmp";

    deleteDirectory(path.join(baseDir, indexDataTmpFileName));
    fs.mkdirSync(path.join(baseDir, indexDataTmpFileName));
    fs.mkdirSync(path.join(baseDir, indexDataTmpFileName, "index"));
    // close index context
    await executeJavaLanguageServerCommand("java.maven.controlContext", false);

    await getGithubData(indexResourceUrl, path.join(baseDir, indexDataTmpFileName));
    await getGithubData(artifactUsageResourceUrl, path.join(baseDir, indexDataTmpFileName));
    deleteDirectory(path.join(baseDir, indexDataFileName));
    fs.renameSync(path.join(baseDir, indexDataTmpFileName), path.join(baseDir, indexDataFileName));
    // open index context
    await executeJavaLanguageServerCommand("java.maven.controlContext", true);
}

async function getGithubData(url: string, dir: string): Promise<void> {
    const res = await axios.get(url);
    if (res.status === 200) {
        if (res.data.length !== undefined) {
            const filePromises = res.data.map(async (file: { download_url: string; name: string; }) => {
                await getResource(file.download_url, path.join(dir, "index", file.name));

            });
            for (const filePromise of filePromises) {
                await filePromise;
            }
        }  else {
            await getResource(res.data.download_url, path.join(dir, res.data.name));
        }
    }  else {
        window.showInformationMessage("Sorry, the index resource is inaccessible.");
    }
}

async function getResource(downloadUrl: string, filePath: string): Promise<void> {
    const res = await axios.get(downloadUrl,
        {
            responseType: "arraybuffer",
            headers: {
                Accept: "application/vnd.github.v3.raw"
            }
        });
    fs.writeFileSync(filePath, res.data);
}

function deleteDirectory(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach((child) => {
            const entry: string = path.join(dir, child);
            if (fs.lstatSync(entry).isDirectory()) {
                deleteDirectory(entry);
            } else {
                fs.unlinkSync(entry);
            }
        });
        fs.rmdirSync(dir);
    }
}
