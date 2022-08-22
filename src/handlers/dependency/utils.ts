import * as vscode from "vscode";
import { Element, isTag, isText } from "domhandler";
import { MavenProject } from "../../explorer/model/MavenProject";
import { UserError } from "../../utils/errorUtils";
import { getNodesByTag, XmlTagName } from "../../utils/lexerUtils";
import { MavenProjectManager } from "../../project/MavenProjectManager";

export async function getDependencyNode(pomPath:string, gid: string, aid: string) {
    const project: MavenProject | undefined = MavenProjectManager.get(pomPath);

    const pomDocument = await vscode.window.showTextDocument(vscode.Uri.file(pomPath), { preserveFocus: true });
    const projectNodes: Element[] = getNodesByTag(pomDocument.document.getText(), XmlTagName.Project);
    if (projectNodes === undefined || projectNodes.length !== 1) {
        throw new UserError("Only support POM file with single <project> node.");
    }

    const projectNode: Element = projectNodes[0];
    const dependenciesNode: Element | undefined = projectNode.children.find(elem => isTag(elem) && elem.tagName === XmlTagName.Dependencies) as Element | undefined;
    return getDependencyNodeFromDependenciesNode(dependenciesNode, gid, aid, project);
}

export function getDependencyNodeFromDependenciesNode(dependenciesNode: Element | undefined, gid: string, aid: string, project?: MavenProject) {
    const dependencyNode = dependenciesNode?.children?.find(node =>
        isTag(node) &&
        node.tagName === XmlTagName.Dependency &&
        node.children?.find(id =>
            isTag(id) && id.tagName === XmlTagName.GroupId &&
            id.firstChild && isText(id.firstChild) &&
            (project ? project.fillProperties(id.firstChild.data) : id.firstChild.data) === gid
        ) &&
        node.children?.find(id =>
            isTag(id) && id.tagName === XmlTagName.ArtifactId &&
            id.firstChild && isText(id.firstChild) &&
            (project ? project.fillProperties(id.firstChild.data) : id.firstChild.data) === aid
        )
    ) as Element | undefined;
    return dependencyNode;
}
