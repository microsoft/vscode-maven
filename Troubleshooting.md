# Troubleshooting

## Requirements
Please make sure Maven is either in the `PATH`, or that `maven.executable.path` is pointed to its installed location. Also make sure `JAVA_HOME` is specified either in environment variables or settings.

### Available Maven executable
By default, `mvn` command is executed directly in the terminal, which requires `mvn` can be found in system envronment `PATH`.
If you do not want to add it into `PATH`, you can specify maven executable path in settings:
    ```
    {
        "maven.executable.path": "/some-path-to-maven-home/bin/mvn"
    }
    ```

#### Possible error messages
Error message can be collected either **directly from the integrated terminal**, or **from `Maven for Java` output panel**.
* Maven executable file not found/set.
    ```
    Command failed: mvn --version 'mvn' is not recognized as an internal or external command, operable program or batch file.
    ```
    In this case, please follow above instructions to set available maven executable path.


* `M2_HOME` not correctly set.
    ```
    Error: Command failed: mvn help:effective-pom -f "xxxxxxxxxxxx\pom.xml" -Doutput="xxxxxxxxxxxxxxx\effective-pom.xml"
    Error: M2_HOME is set to an invalid directory. 
    M2_HOME = "xxxxxxxxx\apache-maven-3.3.9\bin" 
    Please set the M2_HOME variable in your environment to match the 
    location of the Maven installation
    ```
    In this case, please follow the error message to reset a correct `M2_HOME`.

### Available Java Runtime (required by Maven)

#### Possible error messages
* `JAVA_HOME` not correctly set.
    ```
    The JAVA_HOME environment variable is not defined correctly
    This environment variable is needed to run this program
    NB: JAVA_HOME should point to a JDK not a JRE
    ```
    In this case, please specify a correct JAVA_HOME environment variable, or re-install JRE/JDK if necessary.