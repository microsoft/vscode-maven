# Troubleshooting

## Backround knowledge

### Where to find Error logs

There are 2 types of command execution methods.
* **Background command**. It spawns a child process in background for your command, and the process is showing in status bar. E.g. generating effective pom. You can find error logs in an `Output` panel named `Maven for Java`.
* **Terminal command**. It sends plain text of your command to a terminal to execute. E.g. almost all the other Maven commands. Error logs are directly printed in the corresponding terminals.
  
### Requirements

* Install **Java**. Java Runtime is essential to run Maven commands. E.g. [AdoptOpenJDK](https://adoptopenjdk.net/), [Oracle OpenJDK](https://jdk.java.net/), etc.
* **[Install Maven](https://maven.apache.org/install.html) / Maven Wrapper**. The extension actually leverages Maven executable file in your local machine. By default, it tries the following ones in order:
  1. The absolute path specified in config `maven.executable.path` if it is not empty.  This should be the full path including `mvn`, e.g. `"maven.executable.path": "/opt/apache-maven-3.6.2/bin/mvn"` in your `settings.json` file.
  2. `mvnw` file under your workspace root folder. (If you prefer to bypass this one, you can change value of config `maven.executable.preferMavenWrapper` to `false`.)
  3. `mvn` in your system's `PATH`.

## Possible error messages
Error message can be collected either **directly from the integrated terminal**, or **from `Maven for Java` output panel**.

* Maven executable file not found/set.
    ```
    Command failed: mvn --version 'mvn' is not recognized as an internal or external command, operable program or batch file.
    ```
    In this case, please follow above instructions to set available Maven executable path.

* `M2_HOME` not correctly set.
    ```
    Error: Command failed: mvn help:effective-pom -f "xxxxxxxxxxxx\pom.xml" -Doutput="xxxxxxxxxxxxxxx\effective-pom.xml"
    Error: M2_HOME is set to an invalid directory. 
    M2_HOME = "xxxxxxxxx\apache-maven-3.3.9\bin" 
    Please set the M2_HOME variable in your environment to match the 
    location of the Maven installation
    ```
    In this case, please follow the error message to reset a correct `M2_HOME`.

* `JAVA_HOME` not correctly set.
    ```
    The JAVA_HOME environment variable is not defined correctly
    This environment variable is needed to run this program
    NB: JAVA_HOME should point to a JDK not a JRE
    ```
    In this case, please specify a correct `JAVA_HOME` environment variable, or re-install JRE/JDK if necessary.
