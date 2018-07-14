export class MavenProject {
    private _pom: any;

    get name(): string {
        let ret: string;
        try {
            ret = this._pom.project.artifactId[0];
        } catch (error) {
            // ignore it
        }
        return ret;
    }

    get modules(): string[] {
        let ret: string[] = [];
        try {
            ret = this._pom.project.modules[0].module;
        } catch (error) {
            // ignore it
        }
        return ret;
    }

    constructor(pom: any) {
        this._pom = pom;
    }
}
