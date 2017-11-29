# Maven Project Explorer

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Rating](https://vsmarketplacebadge.apphb.com/rating-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Build Status](https://travis-ci.org/Eskibear/vscode-maven.svg)](https://travis-ci.org/Eskibear/vscode-maven)

## Features

Maven extension for VS Code. It now reads `pom.xml` in root folder, and provide project structures in sidebar.

* Effective POM
* Shortcut to common goals, namely `clean`, `validate`, `compile`, `test`, `package`, `verify`, `install`, `site`, `deploy`.
* Perserve history of custom goals for fast re-run long commands(e.g. `clean package -DskipTests`, `spring-boot:run`).
* Can generate projects from Maven Archetype.
* Support multi-module maven projects.
* support VSCode multi-root workspace.

## Requirements

Maven installed and PATH added, i.e., `mvn` command can be executed directly in the terminal.

## Usage

* By default, the extension scans `pom.xml` of each root folder in your workspace, and display corresponding projects and their modules in the sidebar.

    ![Screenshot](images/view_context.png)

* If you want to add project whose `pom.xml` is not under root folder, you can `right-click` on the `pom.xml`, select `Pin to Maven Project Explorer`. The extension will force to show the corresponding project in sidebar.

    ![Screenshot](images/explorer_context.png)

    In fact, the extension simply adds the pom.xml absolute path in your `Workspace Settings`, and then refreshes the whole view.
    ```
    {
        "maven.projects.pinnedPomPaths": [
            "c:\\path-to-project\\a\\generated.from.archetype\\pom.xml"
        ]
    }
    ```
* It perserves history of custom goals for each project, so you can fast re-run previous long commands, something like `mvn <goals> -Dparam1=value1 -Dparam2=value2 -Dparam3=value3 ...` 

    ![Screenshot](images/customGoal.gif)

* Archetype Related
    * **Update Maven Archetype Catalog** Enter URL of the remote catelog file, then it's downloaded to you local repository.
    * **Generate from Maven Archetype** The extension loads archetypes listed in your local catelog. After selection, the extension fires `mvn archetype:generate -D...` in terminal.

    ![Screenshot](images/archetype.gif)

## Release Notes

Refer to [CHANGELOG](CHANGELOG.md)
