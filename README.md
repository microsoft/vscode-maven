# Maven Project Explorer

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Rating](https://vsmarketplacebadge.apphb.com/rating-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Build Status](https://travis-ci.org/Eskibear/vscode-maven.svg)](https://travis-ci.org/Eskibear/vscode-maven)

## Features

Maven extension for VS Code. It now reads `pom.xml` in root folder, and provide project structures in sidebar, improving user experience for Java developers who use Maven.

* Effective POM
* Shortcut to common goals, namely `clean`, `validate`, `compile`, `test`, `package`, `verify`, `install`, `site`, `deploy`.
* Perserve history of custom goals for fast re-run long commands(e.g. `mvn clean package -DskipTests -Dcheckstyle.skip`).
* Can generate projects from Maven Archetype.
* Support multi-module maven projects.
* Support VSCode multi-root workspace.

## Requirements

Provide Maven executable filepath.
* By default, `mvn` command is executed directly in the terminal, which requires `mvn` can be found in system envronment `PATH`.
* If you do not want to add it into `PATH`, you can specify maven executable path in settings:
    ```
    {
        "maven.executable.path": "/some-path-to-maven-home/bin/mvn"
    }
    ```

## Usage

* The extension scans `pom.xml` from each root folder in your workspace recursively, and display all maven projects and their modules in the sidebar.

    ![Screenshot](images/view_context.png)

* To speed up the searching of maven projects, you can exclude folders in settings:
    ```
    {
        "maven.projects.excludedFolders": [
            "**/.*",                // exclude hidden folders
            "**/node_modules"       // exclude node modules to speed up
        ]
    }
    ```

* It perserves history of custom goals for each project, so you can fast re-run previous long commands, e.g. `mvn <goals> -Dparam1=value1 -Dparam2=value2 -Dparam3=value3 ...` 

    ![Screenshot](images/customGoal.gif)

* Archetype Related
    * **Generate from Maven Archetype** The extension loads archetypes listed in local/remote catelog. After selection, the extension fires `mvn archetype:generate -D...` in terminal.

    ![Screenshot](images/archetype.gif)

## Release Notes

Refer to [CHANGELOG](CHANGELOG.md)
