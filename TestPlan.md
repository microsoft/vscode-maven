# Maven Project Explorer View
### Basic view
1. Clone code from https://github.com/Microsoft/todo-app-java-on-azure.git
1. Open the cloned project.
1. Verify: 
    1. The project item is listed in sidebar.

### Open corresponding POM file
1. Right-click on project item
1. Click `Open POM file`
1. Verify: 
    1. It opens the correct POM file in editor.

### Generate Effective POM file
1. Right-click on project item
1. Click `Effective POM`
1. Verify: 
    1. It shows `Generating effective pom ...` in status bar during generating.
    1. Once the operation is over, message is cleaned from status bar, and it opens the Effective POM in editor.

1. Right-click on `pom.xml` in the file explorer view.
1. Click on `Effective POM`
1. Verify that it should have the same behaviour as above.

### Execute Maven goals
1. Right-click on project item
1. Click `clean`/`validate`/`compile`/`test`/`package`/`verify`/`install`/`site`/`deploy`.
1. Verify:
    1. It opens an integrated terminal and sends the corresponding maven command to the terminal.
    1. The maven command works.

### Execute custom goals
1. Right-click on project item
1. Click `Custom goals ... `
1. Input a valid string of goals, e.g. `clean package -DskipTests`, press `Enter`.
1. Verify: 
    1. It execute the corresponding maven command.

### Maven Command History
1. Open command palatte
1. Select "Maven: Command History"
1. Verify:
    1. It lists recently executed maven commands, with information of goals and pom file path.
    1. Select one of them, it should execute the corresponding command.

# Maven Archetypes
### Generate project from maven archetypes
1. Right-click a target folder in file explorer view.
1. Click `Generate from Maven Archetype`.
1. Select the target folder in the popup dialog.
1. Verify:
    1. It should show a dropdown list of popular maven archetypes.
    1. The first item is `More ...`.

1. Select one of the listed archetype.
1. Verify: 
    1. It opens an integrated terminal, and navigates to the target folder you previously selected.
    1. It issues the corresponding maven command (archetype:generate) with correct parameters.
    1. You can interactively continue to fill in missing params in the terminal to complete the task.

### Update
1. Open command palatte
1. Find and select `Maven: Update Maven Archetype Catalog`.
1. Verify: 
    1. It shows `updating archetype catalog ...` in progress bar during updating.
    1. Once the operation is over, progress bar is cleaned.
    1. The `archetypes.json` file located in `$HOME/.vscode/extensions/eskibear.vscode-maven-<version>/resources` is updated.

# Multi-root Workspace Support
1. Clone code from https://github.com/spring-projects/spring-hadoop-samples.git
1. Clone code https://github.com/Microsoft/todo-app-java-on-azure.git
1. Open both above projects in the same VSCode windows under workspace features
1. Verify: 
    1. Projects are listed properly, grouped by root folder.

# Cross-platform Support
1. Open `User Settings`.
1. Check supported platforms and terminals in [README](https://github.com/Eskibear/vscode-maven/blob/develop/README.md)
1. Change value of `terminal.integrated.shell.windows/linux/osx` according to the targeted system and terminal.
1. Test `Custom goals ...`, `Generate project from Maven Archetype` and `Effective POM`.
1. Verify: 
    1. Commands can be successfully executed in above tasks.

# Non-in-PATH maven executable Support (including maven wrapper)
1. Open `User Settings`.
1. Change value of `maven.executable.path` according to the maven executable absolute path.
    * For maven executables, use path of `mvn` / `mvn.cmd`
    * For maven wrapper, use path of `mvnw` / `mvnw.cmd`
1. Test `Custom goals ...`, `Generate project from Maven Archetype` and `Effective POM`.
1. Verify: 
    1. Commands can be successfully executed in above tasks.

# Pom.xml file watcher
The tree view of maven projects should update when any pom.xml is created/modified/deleted in the current workspace.

## Create a pom.xml
1. Open an empty folder in VS Code.
1. Create a project with a valid pom.xml file. E.g. using `Generate from Maven Archetype` command.
1. After the pom.xml file is successfully created, verify:
    1. A corresponding project item is automatically added into the sidebar.

## Modify a pom.xml
1. Open an existing maven project in VS Code.
1. Find the corresponding pom.xml file, and change the value of `artifactId`.
1. Verify:
    1. The corresponding project item in the sidebar is updated with new value of artifact Id.

## Delete a pom.xml
1. Open an existing maven project in VS Code.
1. Find the corresponding pom.xml file and delete it.
1. Verify:
    1. The corresponding project item is removed from the sidebar.

# Maven Executable Options and Enviroment Variables
## Maven Options
1. Open user settings, set a value for `maven.executable.options`, e.g. "-o".
1. Right click on a project to trigger a maven command.
1. Verify:
    1. The command executed in the terminal should have the options appended.

## Enviroment Variables
### Special Handling for JAVA_HOME
1. Install Red Hat's Java Language Support extension.
1. Specify `java.home` in user settings for that extension:
    ```
    "java.home": "<some value>"      // Red Hat Java Language Support Setting
    ```
1. Add following entry in user settings:
    ```
    "maven.terminal.useJavaHome": true      // Use the Red Hat Java Language Support Setting for JAVA_HOME
    ```
1. Trigger a maven command, in the newly created terminal, verify:
    1. value of env `JAVA_HOME` should be the value you just set in `java.home`

### General Environment Variables
1. Specify a environment variable `MAVEN_OPTS` in settings, e.g.
    ```
        {
            "maven.terminal.customEnv": [
                {
                    "environmentVariable": "MAVEN_OPTS",               // variable name
                    "value": "-Xms1024m -Xmx4096m"                     // value
                }
            ]
        }
    ```
1. Trigger a maven command, in the newly created terminal, verify:
    1. value of env `MAVEN_OPTS` should be the value you just set in settings.

# Guide to FAQs page if maven not available 
1. Make sure `mvn` is not in PATH, or you have set wrong `maven.executable.path` in VS Code.
1. Open VS Code, after extension is activated, verify:
    1. It shows a message box for the issue and detailed error message, with 2 buttons `Show settings`, `Show FAQs`.
    1. Click `Show FAQs`, it previews `FAQs.md` in the editor.
    1. Click `Open Settings`, it open settings in the editor.

# For Telemetry 
After above tests, verify corresponding entries in Application Insight portal (vscode maven telemetry test).
* For each command executed, verify:
    1. There are records named `vscjava.vscode-maven/commandStart` and `vscjava.vscode-maven/commandEnd` with same `customDimensions.sessionId`.
    1. For record `vscjava.vscode-maven/commandEnd`, value (ms) of `customMeasurements.duration` is reasonable.
* For command `Generate from Maven Archetype`, verify: 
    1. values of `customDimensions.extra.finishedSteps`, `customDimensions.extra.artifactId` and `customDimensions.extra.groupId` are reasonable.
        * **finishedSteps**: The steps user goes through after triggering the command. Candidates are `TargetFolder`, `ListMore` and `Archetype`.
        * **groupId**: Group Id of selected archetype.
        * **artifactId**: Artifact Id of selected archetype.
