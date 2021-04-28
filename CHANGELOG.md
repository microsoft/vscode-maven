# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.

## 0.30.0
### Changed
- Improved user experience for Maven project creation. [#604](https://github.com/microsoft/vscode-maven/issues/604)

### Fixed
- Archetype catalog could not be update. [#618](https://github.com/microsoft/vscode-maven/pull/618)

## 0.29.0
### Added
- Add shortcuts for common lifecycle phases into Maven explorer. [#601](https://github.com/microsoft/vscode-maven/pull/601)
- Add a new setting `maven.settingsFile` to specify location of settings.xml file. [#581](https://github.com/microsoft/vscode-maven/pull/581)

### Changed
- Only generate effective POMs on demand to improve overall performance. [#579](https://github.com/microsoft/vscode-maven/issues/579)
- Display project name, groupId, artifactId in Maven explorer. [#590](https://github.com/microsoft/vscode-maven/issues/590)

### Fixed
- Fix auto-completion for `version` section. [#594](https://github.com/microsoft/vscode-maven/issues/594)
- Fix auto-completion for `dependency` section when Java extension is working in lightweight mode. [#598](https://github.com/microsoft/vscode-maven/issues/598)
- Fix remote code execution vulnerability. [CVE-2021-28472](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-28472).

## 0.28.0
- Update extension icons. [#578](https://github.com/microsoft/vscode-maven/pull/578)
- Exclude POMs in `archetype-resources` folder by default. [#580](https://github.com/microsoft/vscode-maven/issues/580)
- Update setting `maven.terminal.customEnv` to only affect commands sent to terminal. [#584](https://github.com/microsoft/vscode-maven/pull/584) (Fix for [CVE-2021-27084](https://msrc.microsoft.com/update-guide/vulnerability/CVE-2021-27084))

## 0.27.1
- Refine conceptual title of Maven explorer. [#567](https://github.com/microsoft/vscode-maven/pull/567)
- Improve UX of dependencies navigation. [#571](https://github.com/microsoft/vscode-maven/pull/571) [#572](https://github.com/microsoft/vscode-maven/pull/572) [#573](https://github.com/microsoft/vscode-maven/pull/573)

## 0.27.0
- Support to navigate to dependency POM file with `Ctrl/Cmd + Click`. [#562](https://github.com/microsoft/vscode-maven/pull/562)
- Use a unified command to create projects if Project Manager for Java is enabled. [#488](https://github.com/microsoft/vscode-maven/pull/488)
- Align with VS Code native UX. [#560](https://github.com/microsoft/vscode-maven/pull/560)

## 0.26.0
#### Changed
- Hide Maven Explorer for non-Maven workspaces. [#549](https://github.com/microsoft/vscode-maven/issues/549)
- No longer activate extension on opening xml files. [#555](https://github.com/microsoft/vscode-maven/pull/555)

#### Fixed
- Fix an error creating temporary directory for Remote-SSH scenario with multiple users. [#547](https://github.com/microsoft/vscode-maven/issues/547)
- Fix title of wizard for creating a project. [#551](https://github.com/microsoft/vscode-maven/issues/551)

## 0.25.0
#### Changed
- Allow users to hide the "Create Maven Project" entry in File Explorer. [#536](https://github.com/microsoft/vscode-maven/pull/536)
- Move "Open POM file" into context menu in Project Manager Explorer. [#541](https://github.com/microsoft/vscode-maven/pull/541)
#### Fixed
- Fix "Resolve unknown type" command when folder path contains whitespaces. [#535](https://github.com/microsoft/vscode-maven/pull/535)
- Fix path conversion when using WSL as default integrated terminal. [#542](https://github.com/microsoft/vscode-maven/pull/542)

## 0.24.2
#### Added
- Register entries for commands in Project Manager extension.
  - Add a dependency. [#529](https://github.com/microsoft/vscode-maven/pull/529)
  - Open POM file. [#530](https://github.com/microsoft/vscode-maven/pull/530)
  - Execute Maven Commands... [#531](https://github.com/microsoft/vscode-maven/pull/531)

## 0.24.1
#### Changed
- Change `maven.executable.options` to `machine-overridable` scope.
- Change `maven.executable.preferMavenWrapper` to `resource` scope.

## 0.24.0
#### Added
- Add back buttons to the project creation wizard. [#520](https://github.com/microsoft/vscode-maven/pull/520)

#### Fixed
- Settings `maven.executable.*` are now limited to machine scope. Fix for [CVE-2020-0604](https://portal.msrc.microsoft.com/en-us/security-guidance/advisory/CVE-2020-0604).

## 0.23.0
#### Changed
- Rename project explorer. [#512](https://github.com/microsoft/vscode-maven/pull/512)
- Skip project selection when there is only one project. [#516](https://github.com/microsoft/vscode-maven/pull/516)

#### Fixed
- Fix: terminals were wrongly closed. [#513](https://github.com/microsoft/vscode-maven/pull/513)

## 0.22.0
#### Added
- Better support for PowerShell. [#494](https://github.com/microsoft/vscode-maven/pull/494)

#### Changed
- Keep the cache file of effective pom for diagnosis. [#319](https://github.com/microsoft/vscode-maven/issues/319#issuecomment-601494862)

#### Fixed
- Fix: mvnw was not identified if .mvn folder doesn't exist. [#504](https://github.com/microsoft/vscode-maven/issues/504)
- Fix: notification "Maven executable not found in PATH" pops up for multiple times. [#501](https://github.com/microsoft/vscode-maven/issues/501)
- Fix: tilde was not expanded as home directory in unix-like systems. [#507](https://github.com/microsoft/vscode-maven/pull/507)
- Fix: Maven output didn't write to the integrated terminal window. [#489](https://github.com/microsoft/vscode-maven/issues/489)

## 0.21.4
#### Fixed
- Set custom environment variables in folder level. [#487](https://github.com/microsoft/vscode-maven/issues/487)
- Better support for PowerShell Core. [#492](https://github.com/microsoft/vscode-maven/issues/492)

## 0.21.3
#### Fixed
- Update dependencies to fix vulnerability issues. [#481](https://github.com/microsoft/vscode-maven/pull/481) [#491](https://github.com/microsoft/vscode-maven/pull/491)

## 0.21.2
#### Fixed
- Destination folder was ingored when creating new project. [#478](https://github.com/microsoft/vscode-maven/issues/478)

## 0.21.1
#### Changed
- Reuse VS Code's icons. [#469](https://github.com/microsoft/vscode-maven/pull/469)

#### Fixed
- Terminals were opened in the wrong workspace root folder. [#467](https://github.com/microsoft/vscode-maven/issues/467)
- `NoClassDefFoundError` occurred when resolving unknown types. [#474](https://github.com/microsoft/vscode-maven/issues/474)

## 0.21.0
#### Added
- Support to debug favorite commands. [#444](https://github.com/microsoft/vscode-maven/issues/444)
- Add shortcut to view output when error occurs. [PR#458](https://github.com/microsoft/vscode-maven/pull/458)
- Support to browse to select local Maven executable if not found. [PR#457](https://github.com/microsoft/vscode-maven/pull/457)

#### Changed
- Remove unnecessary prefix `cmd /c` for powershell commands. [#452](https://github.com/microsoft/vscode-maven/issues/452)
- Walk up parent folders to find available Maven wrapper. [#PR460](https://github.com/microsoft/vscode-maven/pull/460)

#### Fixed
- Projects were not indexed when adding a folder to current workspace. [#453](https://github.com/microsoft/vscode-maven/issues/453)

## 0.20.2
#### Fixed
- Improve exposure of command "resolve unknown types". [PR#448](https://github.com/microsoft/vscode-maven/pull/448)

## 0.20.1
#### Fixed
- Insert the dependency into the wrong position when resolving unknown types. [#441](https://github.com/microsoft/vscode-maven/issues/441)

## 0.20.0
#### Added
- Support to "Collapse All" in Maven explorer. [PR#414](https://github.com/microsoft/vscode-maven/pull/414)
- Support to specify the project for command "Maven: Add a dependency". [PR418](https://github.com/microsoft/vscode-maven/pull/418)

#### Changed
- Update related icons in Maven explorer. [PR#425](https://github.com/microsoft/vscode-maven/pull/425)
- Upgrade embeded maven wrapper to 3.6.2. [PR#416](https://github.com/microsoft/vscode-maven/pull/416)

#### Fixed
- Java extension was unnecessarily activated. [#424](https://github.com/microsoft/vscode-maven/issues/424)
- Projects were not identified before expanding the Maven explorer. [#429](https://github.com/microsoft/vscode-maven/issues/429)

## 0.19.1
#### Added
- Provide more completion suggestions for groupId and artifactId on POM file authoring. [PR#404](https://github.com/microsoft/vscode-maven/pull/404)

#### Fixed
- No candidates when resolving unknown types. [PR#405](https://github.com/microsoft/vscode-maven/pull/405)

## 0.19.0
#### Added
- Add inline action buttons in Maven explorer.
- Add icons for Maven explorer items. [PR#397](https://github.com/microsoft/vscode-maven/pull/397)
- Can add dependencies when hovering on unresolved types. [PR#391](https://github.com/microsoft/vscode-maven/pull/391)

#### Fixed
- Cannot show dependencies.
- Expanded plugin nodes tend to collapse after loading. [#364](https://github.com/microsoft/vscode-maven/issues/364)

## 0.18.2
#### Fixed
- Typo in Hover information. [#368](https://github.com/microsoft/vscode-maven/issues/368)
- Unexpected error log on first use. [#358](https://github.com/microsoft/vscode-maven/issues/358)
- Switch to use new VS Code API (v1.37+) to get default shell. [#337](https://github.com/microsoft/vscode-maven/issues/337)

Thank [Christian Lutz @thccorni](https://github.com/thccorni) for contribution.

## 0.18.1
#### Fixed
- Cannot show plugin goals. [#340](https://github.com/microsoft/vscode-maven/issues/340)

## 0.18.0
#### Added
- For Maven project creation:
  - Fallback to use an embedded Maven wrapper if no availble Maven executable is found. [PR#344](https://github.com/microsoft/vscode-maven/pull/344)
  - Support to select archetype version. [#354](https://github.com/microsoft/vscode-maven/issues/354)
- Refresh explorer when config `maven.pomfile.globPattern` changes. [#334](https://github.com/microsoft/vscode-maven/issues/334)

#### Changed
- Change command name "Generate from Maven Archetype" to "Create Maven Project" for clarity. [#345](https://github.com/microsoft/vscode-maven/issues/345)

## 0.17.1
#### Fixed
- Provide a workaround for default shell detection. [#319](https://github.com/microsoft/vscode-maven/issues/319)

## 0.17.0
#### Added
- Add new config `maven.pomfile.globPattern`, which specifies how the extension searchs for POM files. [#316](https://github.com/microsoft/vscode-maven/issues/316)
- Add new config `maven.pomfile.autoUpdateEffectivePOM`, which specifies whether to update Effective-POM automatically. [#319](https://github.com/microsoft/vscode-maven/issues/319)

#### Fixed
- Unexpected insertion of code snippets. [#310](https://github.com/microsoft/vscode-maven/issues/310)
- A bug that Maven `localRepository` setting was not effective. [#322](https://github.com/microsoft/vscode-maven/issues/322)
- Cannot create Maven project when target directory has brackets and default shell is PowerShell. [#324](https://github.com/microsoft/vscode-maven/issues/324)

Thank [Justin Ridgewell (@jridgewell)](https://github.com/jridgewell) for the contributions to make the extension even better.

## 0.16.2
#### Fixed
- A regression issue which blocks auto-completion for pom files. [#311](https://github.com/Microsoft/vscode-maven/issues/311)

## 0.16.1
#### Fixed
- An error on calculating effective pom when there is whitespace in project path. [#304](https://github.com/Microsoft/vscode-maven/issues/304)
- A bug which causes to retry calculating effective pom all the time. [#296](https://github.com/Microsoft/vscode-maven/issues/296)

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
