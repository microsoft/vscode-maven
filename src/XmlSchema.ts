export interface IPomRoot {
    project?: IPomProject;
}

export interface IPomProject {
    modules?: IPomModules[];
    artifactId?: IPomArtifactId[];
}

export interface IPomModules {
    // tslint:disable-next-line:no-reserved-keywords
    module?: IPomModule[];
}

export type IPomModule = string[];
export type IPomArtifactId = string[];

export interface IArchetypeCatalogRoot {
    "archetype-catalog"?: IArchetypeCatalog;
}

export interface IArchetypeCatalog {
    archetypes?: IArchetypes[];
}

export interface IArchetypes {
    archetype?: IArchetype[];
}

export interface IArchetype {
    groupId?: IArchetypeGroupId[];
    artifactId?: IArchetypeArtifactId[];
    version?: IArchetypeVersion[];
    description?: IArchetypeDescription[];
}

export type IArchetypeGroupId = string[];
export type IArchetypeArtifactId = string[];
export type IArchetypeVersion = string[];
export type IArchetypeDescription = string[];
