# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.
- [Change Log](#change-log)
    - [Unreleased](#unreleased)
    - [Released](#released)
        - [0.8.0](#080)
        - [0.7.0](#070)
        - [0.6.0](#060)
        - [0.5.2](#052)
        - [0.5.1](#051)
        - [0.5.0](#050)
    - [Early Versions](#early-versions)
        - [0.4.0](#040)
        - [0.3.0](#030)
        - [0.2.1](#021)
        - [0.2.0](#020)
        - [0.1.4](#014)
        - [0.1.3](#013)
        - [0.1.2](#012)
        - [0.1.1](#011)
        - [0.1.0](#010)
        - [0.0.6](#006)
        - [0.0.5](#005)
        - [0.0.4](#004)
        - [0.0.3](#003)
        - [0.0.2](#002)
        - [0.0.1](#001)

## Unreleased
- Fixed vulnerabilities in package dependencies.
- Formatted filepath for WSL Bash.
- Added entry for historical commands in context menu.

## Released
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

### 0.4.0
- For each root folder of current workspace, auto import all maven projects recursively.
- Support to specify `mvn` executable path.
- Better user experience for generating projects from maven archetypes.

### 0.3.0
- ~~Support~~ Force (Since 0.4.0) to import all projects under specified folder.
- Change extension icon.

### 0.2.1
- add `maven.projects.maxDepthOfPom` to specify max depth to find pom.xml recursively. By default the value is 1, indicating it only searches root folder.

### 0.2.0
- ~~add `maven.projects.pinnedPomPaths` entry in Workspace Settings.~~ (removed since 0.4.0)
- ~~Can manually import `pom.xml` not located in root folder (right-click on `pom.xml`).~~ (removed since 0.4.0)

### 0.1.4
- Use artifactId as name of Node in side bar.(To fix display issues like unparsed `$` signs)

### 0.1.3
- Support different integrated terminals in Windows, namely `Git Bash`, `CMD`, `PowerShell`.

### 0.1.2
- Can select folder to generate project from archetype.

### 0.1.1
- Fix bug for single module project.

### 0.1.0
- Change Logo.
- Add context menu on `pom.xml`.
- Support maven archetype generate.

### 0.0.6 
- Run command in dedicated terminals for each maven project.
- Can persist/edit custom goals.

### 0.0.5 
- Support custom goals.

### 0.0.4 
- Support multi-root.

### 0.0.3
- Support generating effective-pom.

### 0.0.2
- Add icons.

### 0.0.1
- Projects listed in sidebar.
