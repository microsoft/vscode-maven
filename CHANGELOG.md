# Change Log
All notable changes to the "vscode-maven" extension will be documented in this file.

## 0.45.0
### Added
- VS Code Extension contribute to ProblemMatcher [#1098](https://github.com/microsoft/vscode-maven/issues/1098)
- Add optional goal parameter for maven.goal.custom command [#1108](https://github.com/microsoft/vscode-maven/pull/1108)
- maven.executable.options configuration as list of strings [#981](https://github.com/microsoft/vscode-maven/issues/981)

### Fixed
- Fail to disable profile because shell interprets the '!' character [#956](https://github.com/microsoft/vscode-maven/issues/995)

### Changed
- Reload pom contents as needed before finding parent POMs [#956](https://github.com/microsoft/vscode-maven/pull/956)

## 0.44.0
### Added
- add new project as module of existing project via 'New Module...' command. [#849](https://github.com/microsoft/vscode-maven/issues/849).

## 0.43.0
### Changed
- Merge "Refresh" and "Reload All Maven Projects" menus into a single menu "Reload All Maven Projects". [#997](https://github.com/microsoft/vscode-maven/pull/997).

### Fixed
- Create Java Project -> JavaFX does not create a JavaFX project. [#1003](https://github.com/microsoft/vscode-maven/issues/1003).

## 0.42.0
### Added
- Add creating empty maven project without archetypes. [#869](https://github.com/microsoft/vscode-maven/issues/869)

### Changed
- Remove Marketplace preview flag. [#987](https://github.com/microsoft/vscode-maven/pull/987)

### Fixed
- Improve navigation of parent POM. [#959](https://github.com/microsoft/vscode-maven/pull/959)
- Maven explorer failed to list profiles within maven-help-plugin@3.4.0. [#964](https://github.com/microsoft/vscode-maven/issues/964)

## 0.41.0
### Added
- Support to navigate to POM file of modules. [#949](https://github.com/microsoft/vscode-maven/pull/949)
- Support to navigate to parent POM file. [#952](https://github.com/microsoft/vscode-maven/pull/952)
- Add profile support in Maven explorer. [#956](https://github.com/microsoft/vscode-maven/pull/956)

### Changed
- Group common lifecycle phases into a submenu of the context menu. [#954](https://github.com/microsoft/vscode-maven/pull/954)

## 0.40.4
### Fixed
- Missing "Resolve Unknow Type" feature when Language Support for Java was upgraded to v1.14.0. [#932](https://github.com/microsoft/vscode-maven/issues/932)

## 0.40.3
### Fixed
- Cannot navigate to POM of dependencies when `localRepository` is specified in settings.xml. [#924](https://github.com/microsoft/vscode-maven/issues/924)

## 0.40.2
### Fixed
- [CVE-2022-42889](https://github.com/advisories/GHSA-599f-7c49-w659)
- Documentation on tag hover duplicates with the XML extension's implementation. [#918](https://github.com/microsoft/vscode-maven/issues/918)
- Incorrect invocation of the command when debugging plugin goal. [#913](https://github.com/microsoft/vscode-maven/issues/913)

## 0.40.1
### Fixed
- Regression on running plugin goals, where prefix is missing. [#910](https://github.com/microsoft/vscode-maven/issues/910)

## 0.40.0
### Added
- Created a new FavoritesMenu. This menu allows shortcuts to execute the favorite commands. [#884](https://github.com/microsoft/vscode-maven/issues/884)
- Created a UI to add favorites into the user workspace scope. [#901](https://github.com/microsoft/vscode-maven/issues/901)

### Changed
- Improve performance of fetching plugin goals when expanding plugin node in Maven explorer. [#903](https://github.com/microsoft/vscode-maven/pull/903)

## 0.39.2
### Fixed
- Input boxes freeze when value is invalid, since VS Code v1.73.0. [#896](https://github.com/microsoft/vscode-maven/issues/896)

## 0.39.1
### Fixed
- Error "Failed to find dependency" when dependency conflict exists. [#815](https://github.com/microsoft/vscode-maven/issues/815)[#883](https://github.com/microsoft/vscode-maven/pull/883)

## 0.39.0
### Added
- Can filter artifacts with group Id when adding a dependency. [#877](https://github.com/microsoft/vscode-maven/pull/877)

### Changed
- Update depgraph-maven-plugin to 4.0.2, which is used to calculate dependencies. [#867](https://github.com/microsoft/vscode-maven/pull/867)

### Fixed
- Error: UriError path cannot begin with two slash characters. [#817](https://github.com/microsoft/vscode-maven/issues/817)
- Wrongly recongnize Git Bash as WSL when it's not installed on default location. [#874](https://github.com/microsoft/vscode-maven/issues/874)

## 0.38.0
### Added
- Support Maven schema-based completion for pom.xml files. [#857](https://github.com/microsoft/vscode-maven/pull/857)

### Fixed
- Show correct version when inherited from parent projects. [#851](https://github.com/microsoft/vscode-maven/pull/851)

## 0.37.0
### Added
- Better completion for properties. [#843](https://github.com/microsoft/vscode-maven/issues/843)
- Shortcut to reload all Maven projects. [#847](https://github.com/microsoft/vscode-maven/pull/847)
- New setting `maven.explorer.projectName` to customize format of project node name. [#834](https://github.com/microsoft/vscode-maven/pull/834)

### Fixed
- Wrong completion range in pom.xml. [#842](https://github.com/microsoft/vscode-maven/pull/842)
- Error: `mainThreadExtensionService.ts:80 TypeError: r is not iterable` when opening multi-module projects. [#839](https://github.com/microsoft/vscode-maven/pull/839)

## 0.36.0
### Changed
- Replace `xml-zero-lexer` with `htmlparser2` as the parser of pom.xml files. [#822](https://github.com/microsoft/vscode-maven/pull/822)
- Follow upstream change to build JDTLS plugin with JDK 17. [#824](https://github.com/microsoft/vscode-maven/pull/824)

## 0.35.2
### Fixed
- Error "Failed to find dependency" when dependency conflict exists. [#815](https://github.com/microsoft/vscode-maven/issues/815)
- Wrong icon of view-switching buttons. [#814](https://github.com/microsoft/vscode-maven/pull/814)

## 0.35.1

### Added
- Add shortcut for `test-compile` lifecycle. [#798](https://github.com/microsoft/vscode-maven/pull/798)
- Add tooltip showing path of POM file. [#799](https://github.com/microsoft/vscode-maven/pull/799)

### Fixed
- Fix completion of version. [#796](https://github.com/microsoft/vscode-maven/pull/796)

## 0.35.0

### Added
- Enable external call from other extensions to add dependencies. [#743](https://github.com/microsoft/vscode-maven/pull/743)
- Enable external call from other extensions to create Maven projects. [#775](https://github.com/microsoft/vscode-maven/pull/775)

### Fixed
- Custom options were not passed to the command line when creating new projects. [#771](https://github.com/microsoft/vscode-maven/issues/771)
- Failed to attach to remote debuggee VM when debugging a Maven goal. [#757](https://github.com/microsoft/vscode-maven/issues/757)
- Setting `maven.settingsFile` was not honored when executing Maven commands. [#776](https://github.com/microsoft/vscode-maven/pull/776)
- StackOverflowException when there exists circular dependencies in projects. [#763](https://github.com/microsoft/vscode-maven/issues/763)

## 0.34.2
### Fixed
- `Maven: Add a dependency` not working. [#766](https://github.com/microsoft/vscode-maven/issues/766)

## 0.34.1
### Fixed
- Update command for workspace trust management. [#749](https://github.com/microsoft/vscode-maven/pull/749)
- Update third party notices. [#751](https://github.com/microsoft/vscode-maven/pull/751)

## 0.34.0
### Added
- Add command to navigate between conflict dependencies. [#672](https://github.com/microsoft/vscode-maven/issues/672)
- New localization: Chinese (Traditional). [#727](https://github.com/microsoft/vscode-maven/pull/727)

### Changed
- Open POM file under local repository in readonly mode. [#718](https://github.com/microsoft/vscode-maven/issues/718)
- Improve performance on fetching plugin information. [#714](https://github.com/microsoft/vscode-maven/issues/714)

## 0.33.0
### Added
- New entry to `Run` lifecycle phases from context menu. [#700](https://github.com/microsoft/vscode-maven/issues/700)
- New setting `maven.projectOpenBehavior` specifying default way to open newly created project. [#662](https://github.com/microsoft/vscode-maven/issues/662)

### Fixed
- Bugs fixes and improvements related to dependency management.
  - Unified icons. [#707](https://github.com/microsoft/vscode-maven/issues/707)
  - New setting `maven.dependency.enableConflictDiagnostics` specifying whether to show diagnostics for dependency conflicts. [#677](https://github.com/microsoft/vscode-maven/issues/677)

## 0.32.2
### Fixed
- Failed to create project when an empty workspace is opened. [#689](https://github.com/microsoft/vscode-maven/issues/689)
- Malformed dependency node was inserted when pom.xml is dirty. [#690](https://github.com/microsoft/vscode-maven/pull/690) [#691](https://github.com/microsoft/vscode-maven/pull/691)

## 0.32.1
### Fixed
- A text file was wrongly created in workspace when calculating depenencies.

## 0.32.0
### Added
- [Preview] Improve dependency management experience. [#261](https://github.com/microsoft/vscode-maven/issues/261)
  - Visualize dependencies in Maven explorer.
  - Resolve dependency conflicts.

### Changed
- Present Effective POMs better with content provider API. [#680](https://github.com/microsoft/vscode-maven/pull/680)

### Fixed
- Environment varibles not loaded on calculating effective POM. [#637](https://github.com/microsoft/vscode-maven/issues/637)
- Effective POM was not update-to-date. [#681](https://github.com/microsoft/vscode-maven/pull/681)

## 0.31.0
### Added
- Add code action `add a dependency` when cursor is within `<dependencies>` node. [#634](https://github.com/microsoft/vscode-maven/pull/634)

### Fixed
- Fixed error when executing "Custom..." or "Favorites..." from command palette. [#628](https://github.com/microsoft/vscode-maven/pull/628)
- Fixed missing entries when resolving unknown types. [#638](https://github.com/microsoft/vscode-maven/pull/638)

## 0.30.1
### Fixed
- Fixed Maven project creation on Windows. [#623](https://github.com/microsoft/vscode-maven/issues/623)

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
