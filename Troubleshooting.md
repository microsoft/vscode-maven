# Troubleshooting

## Background knowledge

### Where to find Error logs

There are 2 types of command execution methods.
* **Background command**. It spawns a child process in background for your command, and the process is showing in status bar. E.g. generating effective pom. When a background command fails, you will see an error toast along the lines of `Background process terminated with code 1` or `Error occured in background process`. You can find error logs in an `Output` panel named `Maven for Java`.
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

* `JAVA_HOME` not correctly set, or the wrong JDK is being used.
    ```
    The JAVA_HOME environment variable is not defined correctly
    This environment variable is needed to run this program
    NB: JAVA_HOME should point to a JDK not a JRE
    ```
    In this case, please specify a correct `JAVA_HOME` environment variable, or re-install JRE/JDK if necessary.

    If `JAVA_HOME` is set on your system but Maven still picks up a different JDK than your project expects (for example, the system default JDK is used even though your project targets a different version), set the JDK explicitly for Maven via the `maven.terminal.customEnv` setting:

    ```json
    {
        "maven.terminal.customEnv": [
            {
                "environmentVariable": "JAVA_HOME",
                "value": "/path/to/your/jdk"
            }
        ]
    }
    ```

    This value is applied to every Maven invocation this extension launches (both terminal commands and background commands such as effective-pom generation) and takes precedence over the process-level `JAVA_HOME`. After changing the setting, close any existing Maven terminal so the next command picks up the new value.

    > **macOS / Linux note — shell profile may override the injected value.** For terminal commands, the integrated terminal injects `JAVA_HOME` *before* the shell starts. If your shell profile (`~/.zshrc`, `~/.bash_profile`, `~/.profile`, etc.) contains an unconditional `export JAVA_HOME=…`, it runs after the injection and silently overwrites the value, leaving you with the system JDK again. You can confirm by running `echo $JAVA_HOME` in the Maven terminal — if it doesn't match `maven.terminal.customEnv`, your profile is the culprit. Fix it by either removing the export from the profile, or guarding it so it only sets the variable when it is unset:
    >
    > ```bash
    > # ~/.zshrc — only set JAVA_HOME if it isn't already set
    > [ -z "$JAVA_HOME" ] && export JAVA_HOME="$(/usr/libexec/java_home)"
    > ```
    >
    > Background commands (effective-pom generation and other spawned Maven processes) are not affected by this — they bypass the shell entirely.
