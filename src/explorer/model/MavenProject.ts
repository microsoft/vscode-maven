export class MavenProject {
    private _pom: any;
    private _name: string;

    get name(): string {
        return this._name;
    }
    constructor(pom: any) {
        this._pom = pom;
        this._name = this._pom.project.artifactId[0];
    }
}
