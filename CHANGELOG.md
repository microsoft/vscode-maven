# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.
- [Change Log](#change-log)
    - [Unreleased](#unreleased)
    - [Released](#released)
        - [0.9.0](#090)
        - [0.8.0](#080)
        - [0.7.0](#070)
        - [0.6.0](#060)
        - [0.5.2](#052)
        - [0.5.1](#051)
        - [0.5.0](#050)
    - [Early Versions](#early-versions)

## Unreleased

## Released
### 0.9.0
- Fixed vulnerabilities in package dependencies.
- Formatted filepath for WSL Bash.
- Added entry for historical commands in context menu.

### 0.8.0
- Simplified the workflow for executing custom goals.
- Supported to fast re-run maven command from history.
- Supported to trigger maven command from command palette.
- Fixed some bugs.

### 0.7.0
- Added support for setting JAVA_HOME and other environment variables through configuration settings.
- Supported to put popular archetypes ahead when generating projects.
- Supported to append default options for mvn commands.

### 0.6.0
- Supported to auto-update maven project explorer tree view when pom.xml has been created/modified/removed.
- Started to collect anonymous data of **selected Maven Archetype** when users generate projects.

### 0.5.2
- Updated extension name.

### 0.5.1
- Excluded pom.xml in `target` folder by default. (to avoid duplicate item in explorer)
- Fixed CRLF issue [#10](https://github.com/Microsoft/vscode-maven/issues/10).

### 0.5.0
- Supported to use maven wrapper.
- Changed icon of treeItems for dark/light themes.
- Fixed some bugs.

## Early Versions
For historical releases earlier than `v0.4.1`, please refer to [Eskibear/vscode-maven](https://github.com/Eskibear/vscode-maven/releases).
