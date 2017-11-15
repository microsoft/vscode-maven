'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from "path";
import * as md5 from "md5";
import { MavenProjectsTreeDataProvider } from './mavenProjectsTreeDataProvider';
import { Utils } from './utils';
import { MavenProjectTreeItem } from './mavenProjectTreeItem';
import { execSync, exec, spawn } from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-maven" is now active!');

    const mavenProjectsTreeDataProvider = new MavenProjectsTreeDataProvider(context);
    vscode.window.registerTreeDataProvider("mavenProjects", mavenProjectsTreeDataProvider);

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let commandMavenProjectsRefresh = vscode.commands.registerCommand('mavenProjects.refresh', () => {
        mavenProjectsTreeDataProvider.refreshTree();
    });
    let commandMavenGoalExecute = vscode.commands.registerCommand('mavenGoal.exec', (goalItem) => {
        const item = goalItem as MavenProjectTreeItem;
        Utils.runInTerminal(`mvn ${item.label} -f "${item.pomXmlFilePath}"`);
    });
   
    let commandMavenProjectEffectivePom = vscode.commands.registerCommand('mavenProject.effectivePom', (goalItem) => {
        const item = goalItem as MavenProjectTreeItem;
        const tmpdir = process.env["TEMP"];
        const filepath = path.join(tmpdir, md5(item.pomXmlFilePath), 'effective-pom.xml');
        let p = new Promise((resolve, reject) => {
            exec(`mvn help:effective-pom -f "${item.pomXmlFilePath}" -Doutput="${filepath}"`, (error, stdout, stderr) => {
                if (error || stderr) {
                    console.error(error);
                    console.error(stderr);
                    return resolve(false);
                }
                resolve(true);
            });
        }).then(ret => {
            if (ret) {
                vscode.window.showTextDocument(vscode.Uri.file(filepath));
            } else {
                vscode.window.showErrorMessage("Error occurred in generating effective pom.");
            }
        })
        vscode.window.setStatusBarMessage("Generating effective pom ... ", p);
    });

    ['clean', 'validate', 'compile', 'test', 'package', 'verify', 'install', 'site', 'deploy'].forEach(goal => {
        let commandMavenGoal = vscode.commands.registerCommand(`mavenGoal.${goal}`, (goalItem) => {
            const item = goalItem as MavenProjectTreeItem;
            Utils.runInTerminal(`mvn ${goal} -f "${item.pomXmlFilePath}"`);
        });
        context.subscriptions.push(commandMavenGoal);
    });

    context.subscriptions.push(commandMavenProjectsRefresh);
    context.subscriptions.push(commandMavenGoalExecute);
    context.subscriptions.push(commandMavenProjectEffectivePom);
}

// this method is called when your extension is deactivated
export function deactivate() {
}