# Maven Project Explorer

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Rating](https://vsmarketplacebadge.apphb.com/rating-short/eskibear.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=eskibear.vscode-maven) [![Build Status](https://travis-ci.org/Eskibear/vscode-maven.svg)](https://travis-ci.org/Eskibear/vscode-maven)

## Features

Maven extension for VS Code. It now reads `pom.xml` in root folder, and provide project structures in sidebar.

* multi-module projects supported.
* common/custom goals can be executed via Right-Click, namely `clean`, `validate`, `compile`, `test`, `package`, `verify`, `install`, `site`, `deploy`.
* support generating effective pom.
* support VSCode multi-root workspace.

## Requirements

Maven installed and PATH added, i.e., `mvn` command can be executed directly in the terminal.

## Usage

* Basic

![Screenshot](images/screen.gif)

* Custom goals

![Screenshot](images/customGoal.gif)

* Archetype

![Screenshot](images/archetype.gif)

## Release Notes

Refer to [CHANGELOG](CHANGELOG.md)
