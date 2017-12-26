# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.
- [Change Log](#change-log)
    - [Unreleased](#unreleased)
        - [0.5.0](#050)
    - [Released](#released)
        - [0.4.0](#040)
        - [0.3.0](#030)
        - [0.2.x](#021)
        - [0.1.x](#014)
        - [0.0.x](#006)

## Unreleased
### 0.5.0

## Released
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
