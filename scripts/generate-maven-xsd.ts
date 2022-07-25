import { writeFileSync } from "fs";
import * as path from "path";
import * as _ from "lodash";

export function generateMavenDef() {
    const schema = getSchema();
    const dir = path.join(__dirname, '..', 'resources');
    writeFileSync(path.join(dir, "maven-4.0.0.xsd.json"), JSON.stringify(schema, null, 2));
    // writeFileSync(path.join(dir, "maven-4.0.0.xsd-min.json"), JSON.stringify(schema, null));
    return schema;

}

class Documentation {
    constructor(public version?: string, public description?: string) {
    }
}

const M000 = "0.0.0+";
const M300 = "3.0.0+";
const M400 = "4.0.0+";

const DESC = {
    Parent: " The <code>&lt;parent&gt;</code> element contains information required to locate the parent project from which this project will inherit from. <strong>Note:</strong> The children of this element are not interpolated and must be given as literal values. ",
    Parent_groupId: "The group id of the parent project to inherit from.",
    Parent_artifactId: "The artifact id of the parent project to inherit from.",
    Parent_version: "The version of the parent project to inherit.",
    Parent_relativePath: " The relative path of the parent <code>pom.xml</code> file within the check out. If not specified, it defaults to <code>../pom.xml</code>. Maven looks for the parent POM first in this location on the filesystem, then the local repository, and lastly in the remote repo. <code>relativePath</code> allows you to select a different location, for example when your structure is flat, or deeper without an intermediate parent POM. However, the group ID, artifact ID and version are still required, and must match the file in the location given or it will revert to the repository for the POM. This feature is only for enhancing the development in a local checkout of that project. Set the value to an empty string in case you want to disable the feature and always resolve the parent POM from the repositories. ",

    Organization: "Specifies the organization that produces this project.",
    Organization_name: "The full name of the organization.",
    Organization_url: "The URL to the organization's home page.",

    License: "Describes the licenses for this project. This is used to generate the license page of the project's web site, as well as being taken into consideration in other reporting and validation. The licenses listed for the project are that of the project itself, and not of dependencies.",
    License_name: "The full legal name of the license.",
    License_url: "The official url for the license text.",
    License_distribution: " The primary method by which this project may be distributed. <dl> <dt>repo</dt> <dd>may be downloaded from the Maven repository</dd> <dt>manual</dt> <dd>user must manually download and install the dependency.</dd> </dl> ",
    License_comments: "Addendum information pertaining to this license.",

    Developer: "Information about one of the committers on this project.",
    Developer_id: "The unique ID of the developer in the SCM.",
    Developer_name: "The full name of the contributor.",
    Developer_email: "The email address of the contributor.",
    Developer_url: "The URL for the homepage of the contributor.",
    Developer_organization: "The organization to which the contributor belongs.",
    Developer_organizationUrl: "The URL of the organization.",
    Developer_roles: " The roles the contributor plays in the project. Each role is described by a <code>role</code> element, the body of which is a role name. This can also be used to describe the contribution. ",
    Developer_timezone: ` The timezone the contributor is in. Typically, this is a number in the range <a href="http://en.wikipedia.org/wiki/UTC%E2%88%9212:00">-12</a> to <a href="http://en.wikipedia.org/wiki/UTC%2B14:00">+14</a> or a valid time zone id like "America/Montreal" (UTC-05:00) or "Europe/Paris" (UTC+01:00). `,
    Developer_properties: "Properties about the contributor, such as an instant messenger handle.",

    Contributor: "Description of a person who has contributed to the project, but who does not have commit privileges. Usually, these contributions come in the form of patches submitted.",
    Contributor_name: "The full name of the contributor.",
    Contributor_email: "The email address of the contributor.",
    Contributor_url: "The URL for the homepage of the contributor.",
    Contributor_organization: "The organization to which the contributor belongs.",
    Contributor_organizationUrl: "The URL of the organization.",
    Contributor_roles: " The roles the contributor plays in the project. Each role is described by a <code>role</code> element, the body of which is a role name. This can also be used to describe the contribution. ",
    Contributor_timezone: ` The timezone the contributor is in. Typically, this is a number in the range <a href="http://en.wikipedia.org/wiki/UTC%E2%88%9212:00">-12</a> to <a href="http://en.wikipedia.org/wiki/UTC%2B14:00">+14</a> or a valid time zone id like "America/Montreal" (UTC-05:00) or "Europe/Paris" (UTC+01:00). `,
    Contributor_properties: "Properties about the contributor, such as an instant messenger handle.",

    MailingList: "This element describes all of the mailing lists associated with a project. The auto-generated site references this information.",
    MailingList_name: " The name of the mailing list. ",
    MailingList_subscribe: " The email address or link that can be used to subscribe to the mailing list. If this is an email address, a <code>mailto:</code> link will automatically be created when the documentation is created. ",
    MailingList_unsubscribe: " The email address or link that can be used to unsubscribe to the mailing list. If this is an email address, a <code>mailto:</code> link will automatically be created when the documentation is created. ",
    MailingList_post: " The email address or link that can be used to post to the mailing list. If this is an email address, a <code>mailto:</code> link will automatically be created when the documentation is created. ",
    MailingList_archive: "The link to a URL where you can browse the mailing list archive.",
    MailingList_otherArchives: "The link to alternate URLs where you can browse the list archive.",

    Prerequisites: "Describes the prerequisites a project can have.",
    Prerequisites_maven: " For a plugin project (packaging is <code>maven-plugin</code>), the minimum version of Maven required to use the resulting plugin.<br> ",

    Scm: " The <code>&lt;scm&gt;</code> element contains informations required to the SCM (Source Control Management) of the project. ",
    Scm_connection: ` The source control management system URL that describes the repository and how to connect to the repository. For more information, see the <a href="https://maven.apache.org/scm/scm-url-format.html">URL format</a> and <a href="https://maven.apache.org/scm/scms-overview.html">list of supported SCMs</a>. This connection is read-only. <br><b>Default value is</b>: parent value [+ path adjustment] + (artifactId or project.directory property), or just parent value if scm's <code>child.scm.connection.inherit.append.path="false"</code>`,
    Scm_developerConnection: ` Just like <code>connection</code>, but for developers, i.e. this scm connection will not be read only. <br><b>Default value is</b>: parent value [+ path adjustment] + (artifactId or project.directory property), or just parent value if scm's <code>child.scm.developerConnection.inherit.append.path="false"</code> `,
    Scm_tag: "The tag of current code. By default, it's set to HEAD during development.",
    Scm_url: ` The URL to the project's browsable SCM repository, such as ViewVC or Fisheye. <br><b>Default value is</b>: parent value [+ path adjustment] + (artifactId or project.directory property), or just parent value if scm's <code>child.scm.url.inherit.append.path="false"</code> `,
    Scm_childScmConnectionInheritAppendPath: " When children inherit from scm connection, append path or not? Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code> <br><b>Default value is</b>: <code>true</code> <br><b>Since</b>: Maven 3.6.1 ",
    Scm_childScmDeveloperConnectionInheritAppendPath: " When children inherit from scm developer connection, append path or not? Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code> <br><b>Default value is</b>: <code>true</code> <br><b>Since</b>: Maven 3.6.1 ",
    Scm_childScmUrlInheritAppendPath: " When children inherit from scm url, append path or not? Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code> <br><b>Default value is</b>: <code>true</code> <br><b>Since</b>: Maven 3.6.1 ",

    IssueManagement: "Information about the issue tracking (or bug tracking) system used to manage this project.",
    IssueManagement_system: "The name of the issue management system, e.g. Bugzilla",
    IssueManagement_url: "URL for the issue management system used by the project.",

    CiManagement: " The <code>&lt;CiManagement&gt;</code> element contains informations required to the continuous integration system of the project. ",
    CiManagement_system: " The name of the continuous integration system, e.g. <code>continuum</code>. ",
    CiManagement_url: "URL for the continuous integration system used by the project if it has a web interface.",
    CiManagement_notifiers: "Configuration for notifying developers/users when a build is unsuccessful, including user information and notification mode.",

    DistributionManagement: "This elements describes all that pertains to distribution for a project. It is primarily used for deployment of artifacts and the site produced by the build.",
    DistributionManagement_repository: "Information needed to deploy the artifacts generated by the project to a remote repository.",
    DistributionManagement_snapshotRepository: " Where to deploy snapshots of artifacts to. If not given, it defaults to the <code>repository</code> element.",
    DistributionManagement_site: "Information needed for deploying the web site of the project.",
    DistributionManagement_downloadUrl: " The URL of the project's download page. If not given users will be referred to the homepage given by <code>url</code>. This is given to assist in locating artifacts that are not in the repository due to licensing restrictions. ",
    DistributionManagement_relocation: "Relocation information of the artifact if it has been moved to a new group ID and/or artifact ID.",
    DistributionManagement_status: " Gives the status of this artifact in the remote repository. This must not be set in your local project, as it is updated by tools placing it in the reposiory. Valid values are: <code>none</code> (default), <code>converted</code> (repository manager converted this from an Maven 1 POM), <code>partner</code> (directly synced from a partner Maven 2 repository), <code>deployed</code> (was deployed from a Maven 2 instance), <code>verified</code> (has been hand verified as correct and final). ",

    Notifier: "Configures one method for notifying users/developers when a build breaks.",
    Notifier_type: "The mechanism used to deliver notifications.",
    Notifier_sendOnError: "Whether to send notifications on error.",
    Notifier_sendOnFailure: "Whether to send notifications on failure.",
    Notifier_sendOnSuccess: "Whether to send notifications on success.",
    Notifier_sendOnWarning: "Whether to send notifications on warning.",
    Notifier_address: " <b>Deprecated</b>. Where to send the notification to - eg email address. ",
    Notifier_configuration: "Extended configuration specific to this notifier goes here.",

    Relocation: "Describes where an artifact has moved to. If any of the values are omitted, it is assumed to be the same as it was before.",
    Relocation_groupId: "The group ID the artifact has moved to.",
    Relocation_artifactId: "The new artifact ID of the artifact.",
    Relocation_version: "The new version of the artifact.",
    Relocation_message: "An additional message to show the user about the move, such as the reason.",

    DeploymentRepository: "Repository contains the information needed for deploying to the remote repository.",

    DependencyManagement: "Section for management of default dependency information for use in a group of POMs.",
    DependencyManagement_dependencies: `The dependencies specified here are not used until they are referenced in a POM within the group. This allows the specification of a "standard" version for a particular dependency.`,

    Dependency: " The <code>&lt;dependency&gt;</code> element contains information about a dependency of the project. ",
    Dependency_groupId: " The project group that produced the dependency, e.g. <code>org.apache.maven</code>. ",
    Dependency_artifactId: " The unique id for an artifact produced by the project group, e.g. <code>maven-artifact</code>. ",
    Dependency_version: " The version of the dependency, e.g. <code>3.2.1</code>. In Maven 2, this can also be specified as a range of versions. ",
    Dependency_type: ` The type of dependency, that will be mapped to a file extension, an optional classifier, and a few other attributes. Some examples are <code>jar</code>, <code>war</code>, <code>ejb-client</code> and <code>test-jar</code>: see <a href="../maven-core/artifact-handlers.html">default artifact handlers</a> for a list. New types can be defined by extensions, so this is not a complete list. `,
    Dependency_classifier: ` The classifier of the dependency. It is appended to the filename after the version. This allows: <ul> <li>referring to attached artifact, for example <code>sources</code> and <code>javadoc</code>: see <a href="../maven-core/artifact-handlers.html">default artifact handlers</a> for a list,</li> <li>distinguishing two artifacts that belong to the same POM but were built differently. For example, <code>jdk14</code> and <code>jdk15</code>.</li> </ul> `,
    Dependency_scope: ` The scope of the dependency - <code>compile</code>, <code>runtime</code>, <code>test</code>, <code>system</code>, and <code>provided</code>. Used to calculate the various classpaths used for compilation, testing, and so on. It also assists in determining which artifacts to include in a distribution of this project. For more information, see <a href="https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html">the dependency mechanism</a>. The default scope is <code>compile</code>. `,
    Dependency_systemPath: " FOR SYSTEM SCOPE ONLY. Note that use of this property is <b>discouraged</b> and may be replaced in later versions. This specifies the path on the filesystem for this dependency. Requires an absolute path for the value, not relative. Use a property that gives the machine specific absolute path, e.g. <code>${java.home}</code>. ",
    Dependency_exclusions: "Lists a set of artifacts that should be excluded from this dependency's artifact list when it comes to calculating transitive dependencies.",
    Dependency_optional: " Indicates the dependency is optional for use of this library. While the version of the dependency will be taken into account for dependency calculation if the library is used elsewhere, it will not be passed on transitively. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>false</code>. ",

    Exclusion: " The <code>&lt;exclusion&gt;</code> element contains informations required to exclude an artifact to the project. ",
    Exclusion_artifactId: "The artifact ID of the project to exclude.",
    Exclusion_groupId: "The group ID of the project to exclude.",

    Site: "Contains the information needed for deploying websites.",
    Site_id: " A unique identifier for a deployment location. This is used to match the site to configuration in the <code>settings.xml</code> file, for example.",
    Site_name: "Human readable name of the deployment location.",
    Site_url: ` The url of the location where website is deployed, in the form <code>protocol://hostname/path</code>. <br><b>Default value is</b>: parent value [+ path adjustment] + (artifactId or project.directory property), or just parent value if site's <code>child.site.url.inherit.append.path="false"</code> `,

    Profile: "Modifications to the build process which is activated based on environmental parameters or command line arguments.",
    Profile_id: "The identifier of this build profile. This is used for command line activation, and identifies profiles to be merged. ",
    Profile_activation: "The conditional logic which will automatically trigger the inclusion of this profile.",
    Profile_build: "Information required to build the project.",
    Profile_modules: "The modules (sometimes called subprojects) to build as a part of this project. Each module listed is a relative path to the directory containing the module. To be consistent with the way default urls are calculated from parent, it is recommended to have module names match artifact ids.",
    Profile_distributionManagement: "Distribution information for a project that enables deployment of the site and artifacts to remote web servers and repositories respectively.",
    Profile_properties: " Properties that can be used throughout the POM as a substitution, and are used as filters in resources if enabled. The format is <code>&lt;name&gt;value&lt;/name&gt;</code>. ",
    Profile_dependencyManagement: "Default dependency information for projects that inherit from this one. The dependencies in this section are not immediately resolved. Instead, when a POM derived from this one declares a dependency described by a matching groupId and artifactId, the version and other values from this section are used for that dependency if they were not already specified.",
    Profile_dependencies: ` This element describes all of the dependencies associated with a project. These dependencies are used to construct a classpath for your project during the build process. They are automatically downloaded from the repositories defined in this project. See <a href="https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html">the dependency mechanism</a> for more information. `,
    Profile_repositories: "The lists of the remote repositories for discovering dependencies and extensions.",
    Profile_pluginRepositories: "The lists of the remote repositories for discovering plugins for builds and reports.",
    Profile_reports: " <b>Deprecated</b>. Now ignored by Maven. ",
    Profile_reporting: " This element includes the specification of report plugins to use to generate the reports on the Maven-generated site. These reports will be run when a user executes <code>mvn site</code>. All of the reports will be included in the navigation bar for browsing. ",

    Repository: "A repository contains the information needed for establishing connections with remote repository.",
    Repository_releases: "How to handle downloading of releases from this repository.",
    Repository_snapshots: "How to handle downloading of snapshots from this repository.",
    Repository_id: " A unique identifier for a repository. This is used to match the repository to configuration in the <code>settings.xml</code> file, for example. Furthermore, the identifier is used during POM inheritance and profile injection to detect repositories that should be merged. ",
    Repository_name: "Human readable name of the repository.",
    Repository_url: " The url of the repository, in the form <code>protocol://hostname/path</code>. ",
    Repository_layout: " The type of layout this repository uses for locating and storing artifacts - can be <code>legacy</code> or <code>default</code>. ",

    Activation: "The conditions within the build runtime environment which will trigger the automatic inclusion of the build profile. Multiple conditions can be defined, which must be all satisfied to activate the profile.",
    Activation_activeByDefault: "If set to true, this profile will be active unless another profile in this pom is activated using the command line -P option or by one of that profile's activators.",
    Activation_jdk: " Specifies that this profile will be activated when a matching JDK is detected. For example, <code>1.4</code> only activates on JDKs versioned 1.4, while <code>!1.4</code> matches any JDK that is not version 1.4. Ranges are supported too: <code>[1.5,)</code> activates when the JDK is 1.5 minimum. ",
    Activation_os: "Specifies that this profile will be activated when matching operating system attributes are detected.",
    Activation_property: "Specifies that this profile will be activated when this system property is specified.",
    Activation_file: "Specifies that this profile will be activated based on existence of a file.",

    Reporting: "Section for management of reports and their configuration.",
    Reporting_excludeDefaults: ` If true, then the default reports are not included in the site generation. This includes the reports in the "Project Info" menu. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>false</code>. `,
    Reporting_outputDirectory: " Where to store all of the generated reports. The default is <code>${project.build.directory}/site</code>. ",
    Reporting_plugins: "The reporting plugins to use and their configuration.",

    ReportPlugin: " The <code>&lt;plugin&gt;</code> element contains informations required for a report plugin. ",
    ReportPlugin_groupId: "The group ID of the reporting plugin in the repository.",
    ReportPlugin_artifactId: "The artifact ID of the reporting plugin in the repository.",
    ReportPlugin_version: "The version of the reporting plugin to be used.",
    ReportPlugin_reportSets: " Multiple specifications of a set of reports, each having (possibly) different configuration. This is the reporting parallel to an <code>execution</code> in the build. ",
    ReportPlugin_inherited: " Whether any configuration should be propagated to child POMs. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>true</code>. ",
    ReportPlugin_configuration: ` <p>The configuration as DOM object.</p> <p>By default, every element content is trimmed, but starting with Maven 3.1.0, you can add <code>xml:space="preserve"</code> to elements you want to preserve whitespace.</p> <p>You can control how child POMs inherit configuration from parent POMs by adding <code>combine.children</code> or <code>combine.self</code> attributes to the children of the configuration element:</p> <ul> <li><code>combine.children</code>: available values are <code>merge</code> (default) and <code>append</code>,</li> <li><code>combine.self</code>: available values are <code>merge</code> (default) and <code>override</code>.</li> </ul> <p>See <a href="https://maven.apache.org/pom.html#Plugins">POM Reference documentation</a> and <a href="https://codehaus-plexus.github.io/plexus-utils/apidocs/org/codehaus/plexus/util/xml/Xpp3DomUtils.html">Xpp3DomUtils</a> for more information.</p> `,

    ReportSet: "Represents a set of reports and configuration to be used to generate them.",
    ReportSet_id: "The unique id for this report set, to be used during POM inheritance and profile injection for merging of report sets. ",
    ReportSet_reports: "The list of reports from this plugin which should be generated from this set.",
    ReportSet_inherited: " Whether any configuration should be propagated to child POMs. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>true</code>. ",
    ReportSet_configuration: ` <p>The configuration as DOM object.</p> <p>By default, every element content is trimmed, but starting with Maven 3.1.0, you can add <code>xml:space="preserve"</code> to elements you want to preserve whitespace.</p> <p>You can control how child POMs inherit configuration from parent POMs by adding <code>combine.children</code> or <code>combine.self</code> attributes to the children of the configuration element:</p> <ul> <li><code>combine.children</code>: available values are <code>merge</code> (default) and <code>append</code>,</li> <li><code>combine.self</code>: available values are <code>merge</code> (default) and <code>override</code>.</li> </ul> <p>See <a href="https://maven.apache.org/pom.html#Plugins">POM Reference documentation</a> and <a href="https://codehaus-plexus.github.io/plexus-utils/apidocs/org/codehaus/plexus/util/xml/Xpp3DomUtils.html">Xpp3DomUtils</a> for more information.</p> `,

    Build: " The <code>&lt;build&gt;</code> element contains informations required to build the project. Default values are defined in Super POM. ",
    Build_sourceDirectory: " This element specifies a directory containing the source of the project. The generated build system will compile the sources from this directory when the project is built. The path given is relative to the project descriptor. The default value is <code>src/main/java</code>. ",
    Build_scriptSourceDirectory: " This element specifies a directory containing the script sources of the project. This directory is meant to be different from the sourceDirectory, in that its contents will be copied to the output directory in most cases (since scripts are interpreted rather than compiled). The default value is <code>src/main/scripts</code>. ",
    Build_testSourceDirectory: " This element specifies a directory containing the unit test source of the project. The generated build system will compile these directories when the project is being tested. The path given is relative to the project descriptor. The default value is <code>src/test/java</code>. ",
    Build_outputDirectory: " The directory where compiled application classes are placed. The default value is <code>target/classes</code>. ",
    Build_testOutputDirectory: " The directory where compiled test classes are placed. The default value is <code>target/test-classes</code>. ",
    Build_extensions: "A set of build extensions to use from this project.",
    Build_defaultGoal: "The default goal (or phase in Maven 2) to execute when none is specified for the project. Note that in case of a multi-module build, only the default goal of the top-level project is relevant, i.e. the default goals of child modules are ignored. Since Maven 3, multiple goals/phases can be separated by whitespace.",
    Build_resources: " This element describes all of the classpath resources such as properties files associated with a project. These resources are often included in the final package. The default value is <code>src/main/resources</code>. ",
    Build_testResources: " This element describes all of the classpath resources such as properties files associated with a project's unit tests. The default value is <code>src/test/resources</code>. ",
    Build_directory: " The directory where all files generated by the build are placed. The default value is <code>target</code>. ",
    Build_finalName: " The filename (excluding the extension, and with no path information) that the produced artifact will be called. The default value is <code>${artifactId}-${version}</code>. ",
    Build_filters: "The list of filter properties files that are used when filtering is enabled.",
    Build_pluginManagement: "Default plugin information to be made available for reference by projects derived from this one. This plugin configuration will not be resolved or bound to the lifecycle unless referenced. Any local configuration for a given plugin will override the plugin's entire definition here.",
    Build_plugins: "The list of plugins to use.",

    BuildBase: "Generic informations for a build.",
    BuildBase_defaultGoal: "The default goal (or phase in Maven 2) to execute when none is specified for the project. Note that in case of a multi-module build, only the default goal of the top-level project is relevant, i.e. the default goals of child modules are ignored. Since Maven 3, multiple goals/phases can be separated by whitespace.",
    BuildBase_resources: " This element describes all of the classpath resources such as properties files associated with a project. These resources are often included in the final package. The default value is <code>src/main/resources</code>. ",
    BuildBase_testResources: " This element describes all of the classpath resources such as properties files associated with a project's unit tests. The default value is <code>src/test/resources</code>. ",
    BuildBase_directory: " The directory where all files generated by the build are placed. The default value is <code>target</code>. ",
    BuildBase_finalName: " The filename (excluding the extension, and with no path information) that the produced artifact will be called. The default value is <code>${artifactId}-${version}</code>. ",
    BuildBase_filters: "The list of filter properties files that are used when filtering is enabled.",
    BuildBase_pluginManagement: "Default plugin information to be made available for reference by projects derived from this one. This plugin configuration will not be resolved or bound to the lifecycle unless referenced. Any local configuration for a given plugin will override the plugin's entire definition here.",
    BuildBase_plugins: "The list of plugins to use.",


    Extension: "Describes a build extension to utilise.",
    Extension_groupId: "The group ID of the extension's artifact.",
    Extension_artifactId: "The artifact ID of the extension.",
    Extension_version: "The version of the extension.",

    Resource: "This element describes all of the classpath resources associated with a project or unit tests.",
    Resource_targetPath: " Describe the resource target path. The path is relative to the target/classes directory (i.e. <code>${project.build.outputDirectory}</code>). For example, if you want that resource to appear in a specific package (<code>org.apache.maven.messages</code>), you must specify this element with this value: <code>org/apache/maven/messages</code>. This is not required if you simply put the resources in that directory structure at the source, however. ",
    Resource_filtering: " Whether resources are filtered to replace tokens with parameterised values or not. The values are taken from the <code>properties</code> element and from the properties in the files listed in the <code>filters</code> element. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>false</code>. ",
    Resource_directory: "Describe the directory where the resources are stored. The path is relative to the POM.",
    Resource_includes: " A list of patterns to include, e.g. <code>**&#47;*.xml</code>. ",
    Resource_excludes: " A list of patterns to exclude, e.g. <code>**&#47;*.xml</code> ",

    PluginManagement: "Section for management of default plugin information for use in a group of POMs. ",
    PluginManagement_plugins: "The list of plugins to use.",

    Plugin: " The <code>&lt;plugin&gt;</code> element contains informations required for a plugin. ",
    Plugin_groupId: "The group ID of the plugin in the repository.",
    Plugin_artifactId: "The artifact ID of the plugin in the repository.",
    Plugin_version: "The version (or valid range of versions) of the plugin to be used.",
    Plugin_extensions: " Whether to load Maven extensions (such as packaging and type handlers) from this plugin. For performance reasons, this should only be enabled when necessary. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>false</code>. ",
    Plugin_executions: "Multiple specifications of a set of goals to execute during the build lifecycle, each having (possibly) a different configuration.",
    Plugin_dependencies: "Additional dependencies that this project needs to introduce to the plugin's classloader.",
    Plugin_goals: " <b>Deprecated</b>. Unused by Maven. ",
    Plugin_inherited: " Whether any configuration should be propagated to child POMs. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>true</code>. ",
    Plugin_configuration: ` <p>The configuration as DOM object.</p> <p>By default, every element content is trimmed, but starting with Maven 3.1.0, you can add <code>xml:space="preserve"</code> to elements you want to preserve whitespace.</p> <p>You can control how child POMs inherit configuration from parent POMs by adding <code>combine.children</code> or <code>combine.self</code> attributes to the children of the configuration element:</p> <ul> <li><code>combine.children</code>: available values are <code>merge</code> (default) and <code>append</code>,</li> <li><code>combine.self</code>: available values are <code>merge</code> (default) and <code>override</code>.</li> </ul> <p>See <a href="https://maven.apache.org/pom.html#Plugins">POM Reference documentation</a> and <a href="https://codehaus-plexus.github.io/plexus-utils/apidocs/org/codehaus/plexus/util/xml/Xpp3DomUtils.html">Xpp3DomUtils</a> for more information.</p> `,

    PluginExecution: " The <code>&lt;execution&gt;</code> element contains informations required for the execution of a plugin. ",
    PluginExecution_id: "The identifier of this execution for labelling the goals during the build, and for matching executions to merge during inheritance and profile injection.",
    PluginExecution_phase: "The build lifecycle phase to bind the goals in this execution to. If omitted, the goals will be bound to the default phase specified by the plugin.",
    PluginExecution_goals: "The goals to execute with the given configuration.",
    PluginExecution_inherited: " Whether any configuration should be propagated to child POMs. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>true</code>. ",
    PluginExecution_configration: ` <p>The configuration as DOM object.</p> <p>By default, every element content is trimmed, but starting with Maven 3.1.0, you can add <code>xml:space="preserve"</code> to elements you want to preserve whitespace.</p> <p>You can control how child POMs inherit configuration from parent POMs by adding <code>combine.children</code> or <code>combine.self</code> attributes to the children of the configuration element:</p> <ul> <li><code>combine.children</code>: available values are <code>merge</code> (default) and <code>append</code>,</li> <li><code>combine.self</code>: available values are <code>merge</code> (default) and <code>override</code>.</li> </ul> <p>See <a href="https://maven.apache.org/pom.html#Plugins">POM Reference documentation</a> and <a href="https://codehaus-plexus.github.io/plexus-utils/apidocs/org/codehaus/plexus/util/xml/Xpp3DomUtils.html">Xpp3DomUtils</a> for more information.</p> `,

    ActivationProperty: "This is the property specification used to activate a profile. If the value field is empty, then the existence of the named property will activate the profile, otherwise it does a case-sensitive match against the property value as well.",
    ActivationProperty_name: "The name of the property to be used to activate a profile.",
    ActivationProperty_value: "The value of the property required to activate a profile.",

    ActivationFile: "This is the file specification used to activate the profile. The <code>missing</code> value is the location of a file that needs to exist, and if it doesn't, the profile will be activated. On the other hand, <code>exists</code> will test for the existence of the file and if it is there, the profile will be activated.<br> Variable interpolation for these file specifications is limited to <code>${basedir}</code>, System properties and request properties.",
    ActivationFile_missing: "The name of the file that must be missing to activate the profile.",
    ActivationFile_exists: "The name of the file that must exist to activate the profile.",

    ActivationOS: "This is an activator which will detect an operating system's attributes in order to activate its profile.",
    ActivationOS_name: " The name of the operating system to be used to activate the profile. This must be an exact match of the <code>${os.name}</code> Java property, such as <code>Windows XP</code>. ",
    ActivationOS_family: " The general family of the OS to be used to activate the profile, such as <code>windows</code> or <code>unix</code>. ",
    ActivationOS_arch: "The architecture of the operating system to be used to activate the profile.",
    ActivationOS_version: "The version of the operating system to be used to activate the profile.",

    RepositoryPolicy: "Download policy.",
    RepositoryPolicy_enabled: " Whether to use this repository for downloading this type of artifact. Note: While the type of this field is <code>String</code> for technical reasons, the semantic type is actually <code>Boolean</code>. Default value is <code>true</code>. ",
    RepositoryPolicy_updatePolicy: " The frequency for downloading updates - can be <code>always,</code> <code>daily</code> (default), <code>interval:XXX</code> (in minutes) or <code>never</code> (only if it doesn't exist locally). ",
    RepositoryPolicy_checksumPolicy: " What to do when verification of an artifact checksum fails. Valid values are <code>ignore</code> , <code>fail</code> or <code>warn</code> (the default).",

    // project
    project: " The <code>&lt;project&gt;</code> element is the root of the descriptor. The following table lists all of the possible child elements. ",
    project_modelVersion: "Declares to which version of project descriptor this POM conforms.",
    project_parent: "The location of the parent project, if one exists. Values from the parent project will be the default for this project if they are left unspecified. The location is given as a group ID, artifact ID and version.",
    project_groupId: " A universally unique identifier for a project. It is normal to use a fully-qualified package name to distinguish it from other projects with a similar name (eg. <code>org.apache.maven</code>). ",
    project_artifactId: "The identifier for this artifact that is unique within the group given by the group ID. An artifact is something that is either produced or used by a project. Examples of artifacts produced by Maven for a project include: JARs, source and binary distributions, and WARs.",
    project_version: "The current version of the artifact produced by this project.",
    project_packaging: " The type of artifact this project produces, for example <code>jar</code> <code>war</code> <code>ear</code> <code>pom</code>. Plugins can create their own packaging, and therefore their own packaging types, so this list does not contain all possible types. ",
    project_name: "The full name of the project.",
    project_description: "A detailed description of the project, used by Maven whenever it needs to describe the project, such as on the web site. While this element can be specified as CDATA to enable the use of HTML tags within the description, it is discouraged to allow plain text representation. If you need to modify the index page of the generated web site, you are able to specify your own instead of adjusting this text.",
    project_url: " The URL to the project's homepage. <br><b>Default value is</b>: parent value [+ path adjustment] + (artifactId or project.directory property), or just parent value if project's <code>child.project.url.inherit.append.path=\"false\"</code> ",
    project_inceptionYear: "The year of the project's inception, specified with 4 digits. This value is used when generating copyright notices as well as being informational.",
    project_organization: "This element describes various attributes of the organization to which the project belongs. These attributes are utilized when documentation is created (for copyright notices and links).",
    project_licenses: " This element describes all of the licenses for this project. Each license is described by a <code>license</code> element, which is then described by additional elements. Projects should only list the license(s) that applies to the project and not the licenses that apply to dependencies. If multiple licenses are listed, it is assumed that the user can select any of them, not that they must accept all. ",
    project_licenses_license: " This element describes all of the licenses for this project. Each license is described by a <code>license</code> element, which is then described by additional elements. Projects should only list the license(s) that applies to the project and not the licenses that apply to dependencies. If multiple licenses are listed, it is assumed that the user can select any of them, not that they must accept all. ",
    project_developers: "Describes the committers of a project.",
    project_contributors: "Describes the contributors to a project that are not yet committers.",
    project_mailingLists: "Contains information about a project's mailing lists.",
    project_prerequisites: "Describes the prerequisites in the build environment for this project.",
    project_modules: "The modules (sometimes called subprojects) to build as a part of this project. Each module listed is a relative path to the directory containing the module. To be consistent with the way default urls are calculated from parent, it is recommended to have module names match artifact ids.",
    project_scm: "Specification for the SCM used by the project, such as CVS, Subversion, etc.",
    project_issueManagement: "The project's issue management system information.",
    project_ciManagement: "The project's continuous integration information.",
    project_distributionManagement: "Distribution information for a project that enables deployment of the site and artifacts to remote web servers and repositories respectively.",
    project_properties: " Properties that can be used throughout the POM as a substitution, and are used as filters in resources if enabled. The format is <code>&lt;name&gt;value&lt;/name&gt;</code>. ",
    project_dependencyManagement: "Default dependency information for projects that inherit from this one. The dependencies in this section are not immediately resolved. Instead, when a POM derived from this one declares a dependency described by a matching groupId and artifactId, the version and other values from this section are used for that dependency if they were not already specified.",
    project_dependencies: ` This element describes all of the dependencies associated with a project. These dependencies are used to construct a classpath for your project during the build process. They are automatically downloaded from the repositories defined in this project. See <a href="https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html">the dependency mechanism</a> for more information. `,
    project_repositories: "The lists of the remote repositories for discovering dependencies and extensions.",
    project_pluginRepositories: "The lists of the remote repositories for discovering plugins for builds and reports.",
    project_build: "Information required to build the project.",
    project_reports: " <b>Deprecated</b>. Now ignored by Maven. ",
    project_reporting: " This element includes the specification of report plugins to use to generate the reports on the Maven-generated site. These reports will be run when a user executes <code>mvn site</code>. All of the reports will be included in the navigation bar for browsing. ",
    project_profiles: "A listing of project-local build profiles which will modify the build process when activated.",

};

// Converted from https://maven.apache.org/xsd/maven-4.0.0.xsd
const getSchema = () => {
    return {
        project: {
            $type: "Model",
            $documentation: new Documentation(M300, DESC.project),

            modelVersion: stringElement(M400, DESC.project_modelVersion),
            parent: Parent(M400, DESC.project_parent),

            groupId: stringElement(M300, DESC.project_groupId),
            artifactId: stringElement(M300, DESC.project_artifactId),
            version: stringElement(M400, DESC.project_version),
            packaging: stringElement(M400, DESC.project_packaging, "jar"),
            name: stringElement(M300, DESC.project_name),
            description: stringElement(M300, DESC.project_description),
            url: stringElement(M300, DESC.project_url),
            inceptionYear: stringElement(M300, DESC.project_inceptionYear),
            organization: Organization(M300, DESC.project_organization),
            licenses: complexTypeElement(M300, DESC.project_licenses, {
                license: License(M300, DESC.project_licenses_license),
            }),
            developers: complexTypeElement(M300, DESC.project_developers, {
                developer: Developer(),
            }),
            contributors: complexTypeElement(M300, DESC.project_contributors, {
                contributor: Contributor(),
            }),
            mailingLists: complexTypeElement(M300, DESC.project_mailingLists, {
                mailingList: MailingList(),
            }),
            prerequisites: Prerequisites(M400, DESC.project_prerequisites),
            modules: complexTypeElement(M400, DESC.project_modules, {
                module: stringElement(),
            }),
            scm: Scm(M400, DESC.project_scm),
            issueManagement: IssueManagement(M400, DESC.project_issueManagement),
            ciManagement: CiManagement(M400, DESC.project_ciManagement),
            distributionManagement: DistributionManagement(M400, DESC.project_distributionManagement),
            properties: complexTypeElement(M400, DESC.project_properties),
            dependencyManagement: DependencyManagement(M400, DESC.project_dependencyManagement),
            dependencies: complexTypeElement(M300, DESC.project_dependencies, {
                dependency: Dependency(),
            }),
            repositories: complexTypeElement(M400, DESC.project_repositories, {
                repository: Repository(),
            }),
            pluginRepositories: complexTypeElement(M400, DESC.project_pluginRepositories, {
                pluginRepository: Repository(),
            }),
            build: Build(M300, DESC.project_build),
            reports: {...complexTypeElement(M400, DESC.project_reports), $deprecated: true},
            reporting: Reporting(M400, DESC.project_reporting),
            profiles: complexTypeElement(M400, DESC.project_profiles, {
                profile: Profile(),
            }),
        }
    };
};

function booleanElement(version?: string, description?: string, _default?: string) {
    return {
        $type: "xs:string",
        $documentation: new Documentation(version, description),
        $default: _default
    };
}

function stringElement(version?: string, description?: string, _default?: string) {
    return {
        $type: "xs:string",
        $documentation: new Documentation(version, description),
        $default: _default
    };
}

function deprecatedElement(version?: string, description?: string) {
    return {
        $type: "xs:deprecated",
        $documentation: new Documentation(version, description),
        $deprecated: true
    };
}

function complexTypeElement(version: string, description: string, children: any = {}, typeName: string = "complexType") {
    return {
        $type: typeName,
        $documentation: new Documentation(version, description),
        ...children
    };
}

function Parent(version?: string, description?: string) {
    return {
        $type: "Parent",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Parent),
        groupId: stringElement(M400, DESC.Parent_groupId),
        artifactId: stringElement(M400, DESC.Parent_artifactId),
        version: stringElement(M400, DESC.Parent_version),
        relativePath: stringElement(M400, DESC.Parent_relativePath),
    };
}

function Organization(version?: string, description?: string) {
    return {
        $type: "Organization",
        $documentation: new Documentation(version ?? M300, description ?? DESC.Organization),
        name: stringElement(M300, DESC.Organization_name),
        url: stringElement(M300, DESC.Organization_url)
    };
}

function License(version?: string, description?: string) {
    return {
        $type: "License",
        $documentation: new Documentation(version ?? M300, description ?? DESC.License),
        name: stringElement(M300, DESC.License_name),
        url: stringElement(M300, DESC.License_url),
        distribution: stringElement(M300, DESC.License_distribution),
        comments: stringElement(M300, DESC.License_comments),
    };
}

function Developer(version?: string, description?: string) {
    return {
        $type: "Developer",
        $documentation: new Documentation(version ?? M300, description ?? DESC.Developer),
        id: stringElement(M300, DESC.Developer_id),
        name: stringElement(M300, DESC.Developer_name),
        email: stringElement(M300, DESC.Developer_email),
        url: stringElement(M300, DESC.Developer_url),
        organization: stringElement(M300, DESC.Developer_organization),
        organizationUrl: stringElement(M300, DESC.Developer_organizationUrl),
        roles: stringElement(M300, DESC.Developer_roles),
        timezone: stringElement(M300, DESC.Developer_timezone),
        properties: stringElement(M300, DESC.Developer_properties),
    };
}

function Contributor(version?: string, description?: string) {
    return {
        $type: "Contributor",
        $documentation: new Documentation(version ?? M300, description ?? DESC.Contributor),
        name: stringElement(M300, DESC.Contributor_name),
        email: stringElement(M300, DESC.Contributor_email),
        url: stringElement(M300, DESC.Contributor_url),
        organization: stringElement(M300, DESC.Contributor_organization),
        organizationUrl: stringElement(M300, DESC.Contributor_organizationUrl),
        roles: stringElement(M300, DESC.Contributor_roles),
        timezone: stringElement(M300, DESC.Contributor_timezone),
        properties: complexTypeElement(M300, DESC.Contributor_properties, {}),
    };
}

function MailingList(version?: string, description?: string) {
    return {
        $type: "MailingList",
        $documentation: new Documentation(version ?? M300, description ?? DESC.MailingList),

        name: stringElement(M300, DESC.MailingList_name),
        subscribe: stringElement(M300, DESC.MailingList_subscribe),
        unsubscribe: stringElement(M300, DESC.MailingList_unsubscribe),
        post: stringElement(M300, DESC.MailingList_post),
        archive: stringElement(M300, DESC.MailingList_archive),
        otherArchives: complexTypeElement(M300, DESC.MailingList_otherArchives, {
            otherArchive: stringElement(),
        }),
    };
}

function Prerequisites(version?: string, description?: string) {
    return {
        $type: "Prerequisites",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Prerequisites),
        maven: stringElement(M400, DESC.Prerequisites_maven, "2.0"),
    };
}

function Scm(version?: string, description?: string) {
    return {
        $type: "Scm",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Scm),
        maven: stringElement(M400, DESC.Prerequisites_maven, "2.0"),
        connection: stringElement(M400, DESC.Scm_connection),
        developerConnection: stringElement(M400, DESC.Scm_developerConnection),
        tag: stringElement(M400, DESC.Scm_tag, "HEAD"),
        url: stringElement(M400, DESC.Scm_url),
        childScmConnectionInheritAppendPath: stringElement(M400, DESC.Scm_childScmConnectionInheritAppendPath),
        childScmDeveloperConnectionInheritAppendPath: stringElement(M400, DESC.Scm_childScmDeveloperConnectionInheritAppendPath),
        childScmUrlInheritAppendPath: stringElement(M400, DESC.Scm_childScmUrlInheritAppendPath),
    };
}

function IssueManagement(version?: string, description?: string) {
    return {
        $type: "IssueManagement",
        $documentation: new Documentation(version ?? M400, description ?? DESC.IssueManagement),
        system: stringElement(M400, DESC.IssueManagement_system),
        url: stringElement(M400, DESC.IssueManagement_url),
    }
}

function CiManagement(version?: string, description?: string) {
    return {
        $type: "CiManagement",
        $documentation: new Documentation(version ?? M400, description ?? DESC.CiManagement),
        system: stringElement(M400, DESC.CiManagement_system),
        url: stringElement(M400, DESC.CiManagement_url),
        notifiers: complexTypeElement(M400, DESC.CiManagement_notifiers, {
            notifier: Notifier(),
        }),
    }
}

function DistributionManagement(version?: string, description?: string) {
    return {
        $type: "DistributionManagement",
        $documentation: new Documentation(version ?? M400, description ?? DESC.DistributionManagement),
        repository: DeploymentRepository(M400, DESC.DistributionManagement_repository),
        snapshotRepository: DeploymentRepository(M400, DESC.DistributionManagement_snapshotRepository),
        site: Site(M400, DESC.DistributionManagement_site),
        downloadUrl: stringElement(M400, DESC.DistributionManagement_downloadUrl),
        relocation: Relocation(M400, DESC.DistributionManagement_relocation),
        status: stringElement(M400, DESC.DistributionManagement_status),
    }
}

function Notifier() {
    return {
        $type: "Notifier",
        $documentation: new Documentation(M400, DESC.Notifier),

        type: stringElement(M400, DESC.Notifier_type, "mail"),
        sendOnError: stringElement(M400, DESC.Notifier_sendOnError, "true"),
        sendOnFailure: stringElement(M400, DESC.Notifier_sendOnFailure, "true"),
        sendOnSuccess: stringElement(M400, DESC.Notifier_sendOnSuccess, "true"),
        sendOnWarning: stringElement(M400, DESC.Notifier_sendOnWarning, "true"),
        address: stringElement(M400, DESC.Notifier_address),
        configuration: complexTypeElement(M000, DESC.Notifier_configuration, {}),
    };
}

function DeploymentRepository(version?: string, description?: string) {
    return {
        $type: "DeploymentRepository",
        $documentation: new Documentation(version ?? M400, description ?? DESC.DeploymentRepository),
        // TODO:
        // <xs:complexType name="DeploymentRepository">
        // ...
        // </xs:complexType>
    }
}

function Relocation(version?: string, description?: string) {
    return {
        $type: "Relocation",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Relocation),
        groupId: stringElement(M400, DESC.Relocation_groupId),
        artifactId: stringElement(M400, DESC.Relocation_artifactId),
        version: stringElement(M400, DESC.Relocation_version),
        message: stringElement(M400, DESC.Relocation_message),
    }
}

function Site(version?: string, description?: string) {
    return {
        $type: "Site",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Site),
        id: stringElement(M400, DESC.Site_id),
        name: stringElement(M400, DESC.Site_name),
        url: stringElement(M400, DESC.Site_url),
    };
}

function DependencyManagement(version?: string, description?: string) {
    return {
        $type: "DependencyManagement",
        $documentation: new Documentation(version ?? M400, description ?? DESC.DependencyManagement),
        dependencies: complexTypeElement(M400, DESC.DependencyManagement_dependencies, {
            dependency: Dependency(),
        }),
    }
}

function Dependency() {
    return {
        $type: "Dependency",
        $documentation: new Documentation(M300, DESC.Dependency),
        groupId: stringElement(M300, DESC.Dependency_groupId),
        artifactId: stringElement(M300, DESC.Dependency_artifactId),
        version: stringElement(M300, DESC.Dependency_version),
        type: stringElement(M400, DESC.Dependency_type),
        classifier: stringElement(M400, DESC.Dependency_classifier),
        scope: stringElement(M400, DESC.Dependency_scope),
        systemPath: stringElement(M400, DESC.Dependency_systemPath),
        exclusions: complexTypeElement(M400, DESC.Dependency_exclusions, {
            exclusion: Exclusion(),
        }),
        optional: stringElement(M400, DESC.Dependency_optional),
    };
}

function Exclusion() {
    return {
        $type: "Exclusion",
        $documentation: new Documentation(M400, DESC.Exclusion),
        artifactId: stringElement(M400, DESC.Exclusion_artifactId),
        groupId: stringElement(M400, DESC.Exclusion_groupId),
    };
}

function Build(version: string, description: string) {
    return {
        $type: "Build",
        $documentation: new Documentation(version ?? M300, description ?? DESC.Build),
        sourceDirectory: stringElement(M300, DESC.Build_sourceDirectory),
        scriptSourceDirectory: stringElement(M400, DESC.Build_scriptSourceDirectory),
        testSourceDirectory: stringElement(M400, DESC.Build_testSourceDirectory),
        outputDirectory: stringElement(M400, DESC.Build_outputDirectory),
        testOutputDirectory: stringElement(M400, DESC.Build_testOutputDirectory),
        extensions: complexTypeElement(M400, DESC.Build_extensions, {
            extension: Extension(),
        }),
        defaultGoal: stringElement(M300, DESC.Build_defaultGoal),
        resources: complexTypeElement(M300, DESC.Build_resources, {
            resource: Resource(),
        }),
        testResources: complexTypeElement(M400, DESC.Build_testResources, {
            resource: Resource(),
        }),
        directory: stringElement(M400, DESC.Build_directory),
        finalName: stringElement(M400, DESC.Build_finalName),
        filters: complexTypeElement(M400, DESC.Build_filters, {
            filter: stringElement(),
        }),
        pluginManagement: PluginManagement(M400, DESC.Build_pluginManagement),
        plugins: complexTypeElement(M400, DESC.Build_plugins, {
            plugin: Plugin(),
        }),
    }
}

function Reporting(version?: string, description?: string) {
    return {
        $type: "Reporting",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Reporting),
        excludeDefaults: stringElement(M400, DESC.Reporting_excludeDefaults),
        outputDirectory: stringElement(M400, DESC.Reporting_outputDirectory),
        plugins: complexTypeElement(M400, DESC.Reporting_plugins, {
            plugin: ReportPlugin(),
        }),
    };
}

function Profile() {
    return {
        $type: "Profile",
        $documentation: new Documentation(M400, DESC.Profile),
        id: stringElement(M400, DESC.Profile_id, "default"),
        activation: Activation(M400, DESC.Profile_activation),
        build: BuildBase(M400, DESC.Profile_build),
        modules: complexTypeElement(M400, DESC.Profile_modules, {
            module: stringElement(),
        }),
        distributionManagement: DistributionManagement(M400, DESC.Profile_distributionManagement),
        properties: complexTypeElement(M400, DESC.Profile_properties),
        dependencyManagement: DependencyManagement(M400, DESC.Profile_dependencyManagement),
        dependencies: complexTypeElement(M300, DESC.Profile_dependencies, {
            dependency: Dependency(),
        }),
        repositories: complexTypeElement(M400, DESC.Profile_repositories, {
            repository: Repository(),
        }),
        pluginRepositories: complexTypeElement(M400, DESC.Profile_pluginRepositories, {
            repository: Repository(),
        }),
        reports: complexTypeElement(M400, DESC.Profile_reports),
        reporting: Reporting(M400, DESC.Profile_reporting)
    };
}

function Repository() {
    return {
        $type: "Repository",
        $documentation: new Documentation(M400, DESC.Repository),
        releases: RepositoryPolicy(M400, DESC.Repository_releases),
        snapshots: RepositoryPolicy(M400, DESC.Repository_snapshots),
        id: stringElement(M400, DESC.Repository_id),
        name: stringElement(M400, DESC.Repository_name),
        url: stringElement(M400, DESC.Repository_url),
        layout: stringElement(M400, DESC.Repository_layout, "default"),
    };
}

function Activation(version?: string, description?: string) {
    return {
        $type: "Activation",
        $documentation: new Documentation(version ?? M400, description ?? DESC.Activation),
        activeByDefault: booleanElement(M400, DESC.Activation_activeByDefault, "false"),
        jdk: stringElement(M400, DESC.Activation_jdk),
        os: ActivationOS(M400, DESC.Activation_os),
        property: ActivationProperty(M400, DESC.Activation_property),
        file: ActivationFile(M400, DESC.Activation_file)
    }
}

function BuildBase(version?: string, description?: string) {
    return {
        $type: "BuildBase",
        $documentation: new Documentation(version ?? M300, description ?? DESC.BuildBase),
        defaultGoal: stringElement(M400, DESC.BuildBase_defaultGoal),
        resources: complexTypeElement(M400, DESC.BuildBase_resources, {
            resource: Resource(),
        }),
        testResources: complexTypeElement(M400, DESC.BuildBase_testResources, {
            testResource: Resource(),
        }),
        directory: stringElement(M400, DESC.BuildBase_directory),
        finalName: stringElement(M400, DESC.BuildBase_finalName),
        filters: complexTypeElement(M400, DESC.BuildBase_filters, {
            filter: stringElement(),
        }),
        pluginManagement: PluginManagement(M400, DESC.BuildBase_pluginManagement),
        plugins: complexTypeElement(M400, DESC.BuildBase_plugins, {
            plugin: Plugin(),
        }),

    };

}

function RepositoryPolicy(version?: string, description?: string) {
    return {
        $type: "RepositoryPolicy",
        $documentation: new Documentation(version ?? M400, description ?? DESC.RepositoryPolicy),
        enabled: stringElement(M400, DESC.RepositoryPolicy_enabled),
        updatePolicy: stringElement(M400, DESC.RepositoryPolicy_updatePolicy),
        checksumPolicy: stringElement(M400, DESC.RepositoryPolicy_checksumPolicy),
    };
}

function ReportPlugin() {
    return {
        $type: "ReportPlugin",
        $documentation: new Documentation(M400, DESC.ReportPlugin),
        groupId: stringElement(M400, DESC.ReportPlugin_groupId),
        artifactId: stringElement(M400, DESC.ReportPlugin_artifactId),
        version: stringElement(M400, DESC.ReportPlugin_version),
        reportSets: complexTypeElement(M400, DESC.ReportPlugin_reportSets, {
            reportSet: ReportSet(),
        }),
        inherited: stringElement(M400, DESC.ReportPlugin_inherited),
        configuration: complexTypeElement(M400, DESC.ReportPlugin_configuration),
    };
}

function ReportSet() {
    return {
        $type: "ReportSet",
        $documentation: new Documentation(M400, DESC.ReportSet),
        id: stringElement(M000, DESC.ReportSet_id, "default"),
        reports: complexTypeElement(M400, DESC.ReportSet_reports, {
            report: stringElement(),
        }),
        inherited: stringElement(M400, DESC.ReportSet_inherited),
        configuration: complexTypeElement(M400, DESC.ReportSet_configuration),

    };
}

function Extension() {
    return {
        $type: "Extension",
        $documentation: new Documentation(M400, DESC.Extension),
        groupId: stringElement(M400, DESC.Extension_groupId),
        artifactId: stringElement(M400, DESC.Extension_artifactId),
        version: stringElement(M400, DESC.Extension_version),
    };
}

function Resource() {
    return {
        $type: "Resource",
        $documentation: new Documentation(M300, DESC.Resource),
        targetPath: stringElement(M300, DESC.Resource_targetPath),
        filtering: stringElement(M300, DESC.Resource_filtering),
        directory: stringElement(M300, DESC.Resource_directory),
        includes: complexTypeElement(M300, DESC.Resource_includes, {
            include: stringElement(),
        }),
        excludes: complexTypeElement(M300, DESC.Resource_excludes, {
            exclude: stringElement(),
        }),
    }
}

function PluginManagement(version: string, description: string) {
    return {
        $type: "PluginManagement",
        $documentation: new Documentation(version ?? M400, description ?? DESC.PluginManagement),
        plugins: complexTypeElement(M400, DESC.PluginManagement_plugins, {
            plugin: Plugin(),
        }),
    };
}

function Plugin() {
    return {
        $type: "Plugin",
        $documentation: new Documentation(M400, DESC.Plugin),
        groupId: stringElement(M400, DESC.Plugin_groupId, "org.apache.maven.plugins"),
        artifactId: stringElement(M400, DESC.Plugin_artifactId),
        version: stringElement(M400, DESC.Plugin_version),
        extensions: stringElement(M400, DESC.Plugin_extensions),
        executions: complexTypeElement(M400, DESC.Plugin_executions, {
            execution: PluginExecution(),
        }),
        dependencies: complexTypeElement(M400, DESC.Plugin_dependencies, {
            dependency: Dependency(),
        }),
        goals: deprecatedElement(M400, DESC.Plugin_goals),
        inherited: stringElement(M400, DESC.Plugin_inherited),
        configuration: complexTypeElement(M000, DESC.Plugin_configuration),
    }
}

function PluginExecution() {
    return {
        $type: "PluginExecution",
        $documentation: new Documentation(M400, DESC.PluginExecution),
        id: stringElement(M400, DESC.PluginExecution_id),
        phase: stringElement(M400, DESC.PluginExecution_phase),
        goals: complexTypeElement(M400, DESC.PluginExecution_goals, {
            goal: stringElement(),
        }),
        inherited: stringElement(M400, DESC.PluginExecution_inherited),
        configuration: complexTypeElement(M000, DESC.PluginExecution_configration),
    }
}

function ActivationProperty(version?: string, description?: string) {
    return {
        $type: "ActivationProperty",
        $documentation: new Documentation(version ?? M400, description ?? DESC.ActivationProperty),
        name: stringElement(M400, DESC.ActivationProperty_name),
        value: stringElement(M400, DESC.ActivationProperty_value),
    }
}

function ActivationFile(version?: string, description?: string) {
    return {
        $type: "ActivationProperty",
        $documentation: new Documentation(version ?? M400, description ?? DESC.ActivationFile),
        missing: stringElement(M400, DESC.ActivationFile_missing),
        exists: stringElement(M400, DESC.ActivationFile_exists),
    }
}

function ActivationOS(version?: string, description?: string) {
    return {
        $type: "ActivationOS",
        $documentation: new Documentation(version ?? M400, description ?? DESC.ActivationOS),
        name: stringElement(M400, DESC.ActivationOS_name),
        family: stringElement(M400, DESC.ActivationOS_family),
        arch: stringElement(M400, DESC.ActivationOS_arch),
        version: stringElement(M400, DESC.ActivationOS_version),
    }
}

// Execute
generateMavenDef();