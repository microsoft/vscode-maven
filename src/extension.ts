'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MavenProjectsTreeDataProvider } from './mavenProjectsTreeDataProvider';

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
        vscode.window.showInformationMessage('Hello World!');
    });

    context.subscriptions.push(commandMavenProjectsRefresh);
}

// this method is called when your extension is deactivated
export function deactivate() {
}