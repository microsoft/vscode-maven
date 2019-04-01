# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.

## 0.16.0
#### Added
- Support to debug a plugin goal.
  - The feature is designed for debugging code of the plugin goal itself. It can also debug Java classes loaded in the same JVM. 
  - Debugging Java classes loaded by a forked process is not supported. E.g. when `devtools` is present, breakpoints in application code will not be hit when debugging `spring-boot:run` according to [its docs](https://docs.spring.io/spring-boot/docs/current/maven-plugin/run-mojo.html#fork).
- Add a shortcut to show dependency tree.

#### Fixed
- Fix miscellaneous minor issues by enabling TS strict null check.
  
## 0.15.2
#### Fixed
- A potential NPE when no folder is open. [#279](https://github.com/Microsoft/vscode-maven/issues/279)

## 0.15.1
#### Fixed
- Errors on executing some commands when there is no open workspace. [#274](https://github.com/Microsoft/vscode-maven/issues/274) [#277](https://github.com/Microsoft/vscode-maven/issues/277)
- Missing description for favorite commands configuration. [PR#275](https://github.com/Microsoft/vscode-maven/pull/275)

## 0.15.0
#### Added 
- Allow to specify and execute "favorite" Maven commands. [#72](https://github.com/Microsoft/vscode-maven/issues/72) [#259](https://github.com/Microsoft/vscode-maven/issues/259)
- Hover to show effective version of a dependency. [#260](https://github.com/Microsoft/vscode-maven/issues/260)
- Add a command "Maven: Add a dependency" for convenience when editing pom.xml. [#253](https://github.com/Microsoft/vscode-maven/issues/253)

## 0.14.2
#### Fixed 
- Use a simple and robust way to inject custom environment variables into terminals. [PR#240](https://github.com/Microsoft/vscode-maven/pull/240)
- Fix a regression of executing custom goals from command palette. [#243](https://github.com/Microsoft/vscode-maven/issues/243)

## 0.14.1
#### Fixed
- Fix the order of completion items for non-semantic versions. [#236](https://github.com/Microsoft/vscode-maven/issues/236)
- Fix the issue that extension is not activated when opening an external pom.xml file. [#232](https://github.com/Microsoft/vscode-maven/issues/232)

## 0.14.0
#### Added
- Provide completion suggestions leveraging info from both local and central repository. [#195](https://github.com/Microsoft/vscode-maven/issues/195)

#### Fixed
- Fix the issue that mvn help:describe keeps grabbing the focus in MacOSX. [#214](https://github.com/Microsoft/vscode-maven/issues/214)
- Fix WSL file path conversion when the root is changed in `wsl.conf`. [#206](https://github.com/Microsoft/vscode-maven/issues/206)

## 0.13.0
- Support to switch between hierarchical and flat view of modules. [#193](https://github.com/Microsoft/vscode-maven/issues/193)
- Support to complete dependencies when editing pom.xml file. [#195](https://github.com/Microsoft/vscode-maven/issues/195)
  - It is disabled by default, enable it by setting the value of `maven.completion.enabled` to `true`.
  - The dependency candidates are from the local Maven repository.

## 0.12.1
- Chinese localization: Add a whitespace between English and Chinese characters. [#184](https://github.com/Microsoft/vscode-maven/issues/184)
- Add a shortcut in Maven explorer to generate projects. [PR#190](https://github.com/Microsoft/vscode-maven/pull/190)

## 0.12.0
- Support to view and execute plugin goals. [#126](https://github.com/Microsoft/vscode-maven/issues/126)
- Change icons of Maven project nodes. [PR#181](https://github.com/Microsoft/vscode-maven/pull/181)
- Add Chinese localization. [#146](https://github.com/Microsoft/vscode-maven/issues/146)

## 0.11.3
- Fix vulnerability issue of event-stream. [PR#154](https://github.com/Microsoft/vscode-maven/pull/154)

## 0.11.2
- Better support for WSL. [PR#143](https://github.com/Microsoft/vscode-maven/pull/143) by [@RobertDeRose](https://github.com/RobertDeRose)
- Add Chinese localization for configuration entries and command names. [PR#147](https://github.com/Microsoft/vscode-maven/pull/147)
- Fix wording in documents.

Thank [@RobertDeRose](https://github.com/RobertDeRose), [@johanhammar](https://github.com/johanhammar) and [@apupier](https://github.com/apupier) for the contribution.

## 0.11.1
- Use the latest version of vscode-extension-telemetry dependency. [#135](https://github.com/Microsoft/vscode-maven/issues/135)

## 0.11.0
- Sort Maven projects alphabetically in Explorer. [PR#118](https://github.com/Microsoft/vscode-maven/pull/118) by @owenconti
- Adjust order of steps when generating projects from an archetype. [#122](https://github.com/Microsoft/vscode-maven/issues/122)
- Open trouble-shooting page in browser.[PR#131](https://github.com/Microsoft/vscode-maven/pull/131)
- Fixed some bugs.

Thank [Owen Conti (@owenconti)](https://github.com/owenconti) for the help to make the extension even better.

## 0.10.0
- Supported to hide Maven explorer view by default. [#51](https://github.com/Microsoft/vscode-maven/issues/51)
- Started to use a separate terminal for each root folder. [#68](https://github.com/Microsoft/vscode-maven/pull/87)
- Improved performance of searching for pom.xml [#77](https://github.com/Microsoft/vscode-maven/issues/77)
- Started to includes Maven archetypes in local catalog when generating projects. [#82](https://github.com/Microsoft/vscode-maven/issues/82)
- Forced to use mvn wrapper as Maven executable file if one is found in root folder, and added a new configuration `maven.executable.preferMavenWrapper` allowing to turn it off. [#84](https://github.com/Microsoft/vscode-maven/issues/84) [#105](https://github.com/Microsoft/vscode-maven/pull/105)
- Refined command `maven.history` to re-run historical goals.[#87](https://github.com/Microsoft/vscode-maven/issues/87)
- Started to use "cmd /c" to execute Maven commands for PowerShell.[#112](https://github.com/Microsoft/vscode-maven/pull/112)
- Supported to update explorer automatically when workspace folders change. [#27](https://github.com/Microsoft/vscode-maven/issues/27)
- Some code refactoring and bug fixing.

## 0.9.2
- Fixed bug of using `./mvnw` as maven executable.

## 0.9.1
- Fetch list of popular archetypes on the fly. [#63](https://github.com/Microsoft/vscode-maven/pull/63)
- Guide users to setup correct mvn executable path when error occurs. [#66](https://github.com/Microsoft/vscode-maven/pull/66)
- Fixed some bugs.

## 0.9.0
- Fixed vulnerabilities in package dependencies.
- Formatted filepath for WSL Bash.
- Added entry for historical commands in context menu.

## 0.8.0
- Simplified the workflow for executing custom goals.
- Supported to fast re-run maven command from history.
- Supported to trigger maven command from command palette.
- Fixed some bugs.

## 0.7.0
- Added support for setting JAVA_HOME and other environment variables through configuration settings.
- Supported to put popular archetypes ahead when generating projects.
- Supported to append default options for mvn commands.

## 0.6.0
- Supported to auto-update maven project explorer tree view when pom.xml has been created/modified/removed.
- Started to collect anonymous data of **selected Maven Archetype** when users generate projects.

## 0.5.2
- Updated extension name.

## 0.5.1
- Excluded pom.xml in `target` folder by default. (to avoid duplicate item in explorer)
- Fixed CRLF issue [#10](https://github.com/Microsoft/vscode-maven/issues/10).

## 0.5.0
- Supported to use maven wrapper.
- Changed icon of treeItems for dark/light themes.
- Fixed some bugs.

## Early Versions
For historical releases earlier than `v0.4.1`, please refer to [Eskibear/vscode-maven](https://github.com/Eskibear/vscode-maven/releases).
