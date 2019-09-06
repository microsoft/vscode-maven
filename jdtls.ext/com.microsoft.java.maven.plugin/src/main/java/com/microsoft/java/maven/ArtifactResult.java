/*******************************************************************************
 * Copyright (c) 2019 Microsoft Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Microsoft Corporation - initial API and implementation
 *******************************************************************************/

package com.microsoft.java.maven;

public class ArtifactResult {

    private String groupId;

    private String artifactId;

    private String version;

    private String className;

    private String fullClassName;

    private int usage;

    private int kind;

    public static final int PREFIX = 1;
    public static final int FUZZY = 2;

    public ArtifactResult(String groupId, String artifactId, String version, String className,
        String fullClassName, int usage, int kind) {
        this.setGroupId(groupId);
        this.setArtifactId(artifactId);
        this.setVersion(version);
        this.setClassName(className);
        this.setFullClassName(fullClassName);
        this.setUsage(usage);
        this.setKind(kind);
    }

    public String getFullClassName() {
        return fullClassName;
    }

    public void setFullClassName(String fullClassName) {
        this.fullClassName = fullClassName;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getArtifactId() {
        return artifactId;
    }

    public void setArtifactId(String artifactId) {
        this.artifactId = artifactId;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public int getUsage() {
        return usage;
    }

    public void setUsage(int usage) {
        this.usage = usage;
    }

    public int getKind() {
        return kind;
    }

    public void setKind(int kind) {
        this.kind = kind;
    }

    @Override
    public String toString() {
        return groupId + ":" + artifactId + ":" + version + ":" + className + ":" + fullClassName;
    }
}

