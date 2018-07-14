import * as vscode from "vscode"; 
import * as Constants from "../../Constants";
import { Utils } from "../../Utils";
import { MavenProject } from "./MavenProject";
import { NodeBase } from "./NodeBase";

export class MavenProjectNode extends NodeBase {
    private _pomPath: string;
    private _mavenProject: MavenProject;

    constructor(pomPath: string) {
        super();
        this._pomPath = pomPath;
    }

    public get pomPath(): string {
        return this._pomPath;
    }

    public async getTreeItem(): Promise<vscode.TreeItem> {
        await this._ensureMavenProjectParsed();
        const treeItem: vscode.TreeItem = new vscode.TreeItem(this._mavenProject.name);
        treeItem.iconPath = {
            light: Utils.getResourcePath("project.svg"),
            dark: Utils.getResourcePath("project.svg")
        };
        treeItem.contextValue = Constants.contextValue.MAVEN_PROJECT_NODE;
        return treeItem;

    }

    public getChildren(): vscode.ProviderResult<NodeBase[]> {
        return [];
    }

    private async _ensureMavenProjectParsed(): Promise<void> {
        if (!this._mavenProject) {
            const pom: {} = await Utils.parseXmlFile(this._pomPath);
            this._mavenProject = new MavenProject(pom);
        }
    }
}
