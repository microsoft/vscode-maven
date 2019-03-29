# Test Plan

## Basic view

### Explore Items

1. Clone code from https://github.com/Microsoft/todo-app-java-on-azure.git
2. Open the cloned project.
3. Verify: 
    1. The project item is listed in sidebar.
    2. Expand the project node, it's a "Plugins" node.
    3. Expand "Plugins" node, plguins are listed.
    4. Expand a plugin node, plugin specified goals are listed.
    5. Right click a goal, choose "Execute", it can execute the corresponding command in the terminal.

### Open corresponding POM file
1. Click on project item
2. Verify: 
    1. It opens the corresponding POM file in editor.

### Generate Effective POM file
1. Right-click on project item
2. Click `Effective POM`
3. Verify: 
    1. It shows `Generating effective pom ...` in status bar during generating.
    2. Once the operation is over, message is cleaned from status bar, and it opens the Effective POM in editor.
4. Right-click on `pom.xml` in the file explorer view.
5. Click on `Effective POM`
6. Verify that it should have the same behaviour as above.

### Execute Maven goals
1. Right-click on project item
3. Click `clean`/`validate`/`compile`/`test`/`package`/`verify`/`install`/`site`/`deploy`.
4. Verify:
    1. It opens an integrated terminal and sends the corresponding maven command to the terminal.
    2. The maven command works.

### Execute custom goals
1. Right-click on project item
1. Click `Custom ... `
1. Input a valid string of goals, e.g. `clean package -DskipTests`, press `Enter`.
1. Verify: 
    1. It execute the corresponding maven command.

### Maven Command History
1. Open a folder with more than one maven project.
2. Open command palatte.
3. Select `Maven: History ...`
4. Verify:
    1. It lists recently executed maven commands **for all projects in workspaces**, with information of goals and pom file path.
    2. Select one of them, it should execute the corresponding command.
5. Right-click on one of the project item, click `History...`.
6. Verify:
    1. It lists recently executed maven commands **for this project**, with information of goals and pom file path.
    2. Select one of them, it should execute the corresponding command.

### Maven Favorite Command
1. Specify a favorite command in settings, e.g.
    ```
        {
            "maven.terminal.favorite": [
                {
                    "alias": "full-build without tests",
                    "command": "clean package -DskipTests"
                }
            ]
        }
    ```
2. Right-click on project item, click `Favorite ...`
3. Verify: 
    1. It should show favorite commands in a drop-down list.
    2. Click one, it should execute the corresponding maven command.

## Maven Archetypes
### Generate project from maven archetypes
1. Right-click a target folder in file explorer view.
2. Click `Generate from Maven Archetype`.
3. Verify:
    1. It should show a dropdown list of popular maven archetypes.
    2. The first item is `More ...`.
4. Select one of the listed archetype.
5. Select the target folder in the popup dialog.
6. Verify: 
    1. It opens an integrated terminal, and navigates to the target folder you previously selected.
    2. It issues the corresponding maven command (archetype:generate) with correct parameters.
    3. You can interactively continue to fill in missing params in the terminal to complete the task.

### Generate project from maven archetypes (for empty workspace)
1. Open Command Palette.
2. Click `Maven: Generate from Maven Archetype`.
3. Verify:
    1. It should show a dropdown list of popular maven archetypes.
    2. The first item is `More ...`.
4. Select one of the listed archetype.
5. Select the target folder in the popup dialog.
6. Verify: 
    1. It opens an integrated terminal, and navigates to the target folder you previously selected.
    2. It issues the corresponding maven command (archetype:generate) with correct parameters.
    3. You can interactively continue to fill in missing params in the terminal to complete the task.


### Update Maven Archetype Catalog
1. Open command palatte
2. Find and select `Maven: Update Maven Archetype Catalog`.
3. Verify: 
    1. It shows `updating archetype catalog ...` in progress bar during updating.
    2. Once the operation is over, progress bar is cleaned.
    3. The `archetypes.json` file located in `$HOME/.vscode/extensions/vscjava.vscode-maven-<version>/resources` is updated.

## Executable related
### Maven Wrapper support
1. Clone code https://github.com/Microsoft/todo-app-java-on-azure.git
2. Test `clean`, `Generate project from Maven Archetype` and `Effective POM`.
3. Verify: 
    1. It uses `./mvnw` in the root folder as executable, and no error occurs.
   
### Non-in-PATH maven executable Support
1. Clone code https://github.com/Microsoft/todo-app-java-on-azure.git
2. Open `User Settings`.
3. Change value of `maven.executable.path` according to the maven executable absolute path.
    * For maven executables, use path of `mvn` / `mvn.cmd`
    * For maven wrapper, use path of `mvnw` / `mvnw.cmd`
4. Test `clean`, `Generate project from Maven Archetype` and `Effective POM`.
5. Verify: 
    1. Corresponding executable is used and commands can be successfully executed with no error.

## Pom.xml file watcher
The tree view of maven projects should update when any pom.xml is created/modified/deleted in the current workspace.

### Create a pom.xml
1. Open an empty folder in VS Code.
2. Create a project with a valid pom.xml file. E.g. using `Generate from Maven Archetype` command.
3. After the pom.xml file is successfully created, verify:
    1. A corresponding project item is automatically added into the sidebar.

### Modify a pom.xml
1. Open an existing maven project in VS Code.
2. Find the corresponding pom.xml file, and change the value of `artifactId`.
3. Verify:
    1. The corresponding project item in the sidebar is updated with new value of artifact Id.

### Delete a pom.xml
1. Open an existing maven project in VS Code.
2. Find the corresponding pom.xml file and delete it.
3. Verify:
    1. The corresponding project item is removed from the sidebar.

## Maven Executable Options and Enviroment Variables
### Maven Options
1. Open user settings, set a value for `maven.executable.options`, e.g. "-o".
2. Right click on a project to trigger a maven command.
3. Verify:
    1. The command executed in the terminal should have the options appended.

### Special Handling for JAVA_HOME
1. Install Red Hat's Java Language Support extension.
2. Specify `java.home` in user settings for that extension:
    ```
    "java.home": "<some value>"      // Red Hat Java Language Support Setting
    ```
3. Add following entry in user settings:
    ```
    "maven.terminal.useJavaHome": true      // Use the Red Hat Java Language Support Setting for JAVA_HOME
    ```
4. Trigger a maven command, in the newly created terminal, verify:
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
2. Trigger a maven command, in the newly created terminal, verify:
    1. value of env `MAVEN_OPTS` should be the value you just set in settings.

### Guide to Troubleshooting page if error occurs. 
1. Make sure `mvn` is not in PATH, or you have set wrong `maven.executable.path` in VS Code.
2. Open VS Code, open a project, execute `Effective POM`, verify:
    1. It shows a message box for the issue and detailed error message.
    2. Click `Learn more`, it previews `Troubleshooting.md` in the editor.


## Others

### Multi-root Workspace Support
1. Clone code from https://github.com/spring-projects/spring-hadoop-samples.git
2. Clone code https://github.com/Microsoft/todo-app-java-on-azure.git
3. Open both above projects in the same VSCode windows under workspace features
4. Verify: 
    1. Projects are listed properly, grouped by root folder.

### Cross-platform Support
1. Open `User Settings`.
2. Check supported platforms and terminals in [README](https://github.com/Eskibear/vscode-maven/blob/develop/README.md)
3. Change value of `terminal.integrated.shell.windows/linux/osx` according to the targeted system and terminal.
4. Test `Custom ...`, `Generate project from Maven Archetype` and `Effective POM`.
5. Verify: 
    1. Commands can be successfully executed in above tasks.

## For Telemetry 
After above tests, verify corresponding entries in Application Insight portal.
- For develop build, verify in `vscode maven telemetry test`.
- For RC build, verify in `vscode maven telemetry prod`.

#### Verification
* For extension activation and each command executed, verify:
    1. There are records named `vscjava.vscode-maven/opStart` and `vscjava.vscode-maven/opEnd` with same `customDimensions.operationId`, `customDimensions.operationName`
    2. In `opEnd`, check `customDimensions.errorCode`
        1. 0 for no error.
        2. Non-zero values indicate there's an error, check `message`, `stack`, `errorType` in `customDimensions`.
        3. For non-zero values, there should be an extra record `vscjava.vscode-maven/error` carrying the same error information.
* For command `Generate from Maven Archetype`, verify: 
    1. Records named `vscjava.vscode-maven/opStep` are sent after each step is executed. 
    2. For some steps, an extra `vscjava.vscode-maven/info` is sent carrying information. E.g.:
        * **groupId**: Group Id of selected archetype.
        * **artifactId**: Artifact Id of selected archetype.
