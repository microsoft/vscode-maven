import { Utils } from "../../Utils";

export class MavenProject {
    private _pom: {};
    private _name: string;
    get name(): string {
        return this._name;
    }
    constructor(pomPath: string) {
        this._pom = Utils.readXmlContent(pomPath);
    }
}