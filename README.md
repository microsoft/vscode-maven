# Maven for Java

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/vscjava.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)
[![Installs](https://vsmarketplacebadge.apphb.com/installs-short/vscjava.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)
[![Rating](https://vsmarketplacebadge.apphb.com/rating-short/vscjava.vscode-maven.svg)](https://marketplace.visualstudio.com/items?itemName=vscjava.vscode-maven)
[![Build Status](https://travis-ci.org/Microsoft/vscode-maven.svg)](https://travis-ci.org/Microsoft/vscode-maven)

## Features

Maven extension for VS Code. It provides a project explorer and shortcuts to execute Maven commands, improving user experience for Java developers who use Maven.

* Support to generate projects from Maven Archetype.
* Support to generate effective POM.
* Provide shortcuts to common goals, namely `clean`, `validate`, `compile`, `test`, `package`, `verify`, `install`, `site`, `deploy`.
* Preserve command history to fast re-run.


## Requirements
* Java
* Maven / Maven Wrapper

For troubleshooting, please refer to the page [HERE](Troubleshooting.md).

## Basic Usage
<details>
<summary>Maven Explorer</summary>

The extension scans `pom.xml` in your workspace, and displays all Maven projects and their modules in the sidebar.

![Screenshot](images/explorer.png)

</details>

<details>
<summary>Re-Run Historical Commands</summary>

It preserves history of goals for each project, so you can fast re-run previous long commands, e.g. `mvn <goals> -Dparam1=value1 -Dparam2=value2 -Dparam3=value3 ...` 
There are 2 entries for it:
* Command Palette -> select `Maven: History ...` -> Select a project -> Select command from the history
* Right-click on a project -> Click `History ...` -> Select command from the history

![Screenshot](images/history.gif)
</details>
 
<details>
<summary>Archetype Related</summary>

### Generate from Maven Archetype
The extension loads archetypes listed in local/remote catalog. After selection, the extension sends `mvn archetype:generate -D...` to terminal.
There are 2 entries for it:
* Command Palette -> select `Maven: Generate from Maven Archetype`
* Right-click on a folder -> Click `Generate from Maven Archetype` 

![Screenshot](images/archetype.gif)

### Update Maven Archetype Catalog
With following steps, you can update the **local cache** of Maven **remote catalog**. It takes some time to download meta data from Maven central repository.

Command Palette -> select `Maven: Update Maven Archetype Catalog`.

</details>

## Additional Configurations

<details>
<summary>JAVA_HOME and Other Environment Variables</summary>

This extension executes Maven by opening a terminal session and then calling Maven in that session.
Maven requires the JAVA_HOME environment variable to be set. Maven will also look for other variables such as MAVEN_OPTS. If you prefer not to set those variables permanently you can configure them, or any other environment variable, in settings:

```json
{
    "maven.terminal.customEnv": [
        {
            "environmentVariable": "MAVEN_OPTS",               // variable name
            "value": "-Xms1024m -Xmx4096m"                     // value
        },
        {
            "environmentVariable": "JAVA_HOME",                // variable name
            "value": "C:\\Program Files\\Java\\jdk-9.0.4"      // value
        }
    ]
}
```
</details>

<details>
<summary>Special Handling for JAVA_HOME</summary>

If you have Red Hat's Java Language Support extension installed, then you can specify JAVA_HOME in settings for that extension:

```json
{
    "java.home": "C:\\Program Files\\Java\\jdk-9.0.4"      // Red Hat Java Language Support Setting
}
```

This extension (Maven for Java) can reuse that setting if you desire:

```json
{
    "maven.terminal.useJavaHome": true      // Use the Red Hat Java Language Support Setting for JAVA_HOME
}
```

With this support, you can specify JAVA_HOME in one place and you do not need to use the `maven.terminal.customEnv` setting unless
you have other environment variables to set.

If you have JAVA_HOME configured through the `maven.terminal.customEnv` setting, and also specify to reuse the Red Hat setting, then the value from `maven.terminal.customEnv` will take precedence.

</details>

<details>
<summary>Default Options for Maven Command</summary>
The usage of maven executable is:

> usage: mvn [options] [<goal(s)>] [<phase(s)>]

You can use `maven.executable.options` to specify default **options** for all your Maven commands executed in current project.
```json
{
    "maven.executable.options": "-o -s ./settings.xml"      // work offline, and use an alternative settings file 
}
```
</details>

<details>
<summary>Folder Exclusion for Searching POM Files</summary>

To speed up the searching of Maven projects, you can exclude folders in settings:

```json
{
    "maven.projects.excludedFolders": [
        "**/.*",                // exclude hidden folders
        "**/node_modules",      // exclude node modules to speed up
        "**/target"             // exclude duplicated pom file in target folder
    ]
}
```
</details>

## Data/Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](http://go.microsoft.com/fwlink/?LinkId=521839) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## Contributing

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Release Notes

Refer to [CHANGELOG](CHANGELOG.md)
