# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.
- [Change Log](#change-log)
    - [Unreleased](#unreleased)
    - [Released](#released)
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
- Support to import all projects under specified folder.

## Released
### 0.2.1
- add `maven.projects.maxDepthOfPom` to specify max depth to find pom.xml recursively. By default the value is 1, indicating it only searches root folder.

### 0.2.0
- add `maven.projects.pinnedPomPaths` entry in Workspace Settings.
- Can manually import `pom.xml` not located in root folder (right-click on `pom.xml`).

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
