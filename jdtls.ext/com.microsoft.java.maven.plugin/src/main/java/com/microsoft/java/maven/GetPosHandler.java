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

import org.apache.commons.lang3.StringUtils;
import org.eclipse.lsp4j.Position;
import org.xml.sax.Attributes;
import org.xml.sax.Locator;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

class GetPosHandler extends DefaultHandler {
    private Locator locator;
    private PosInfo posInfo = new PosInfo();
    private static final int LINE_OFFSET = 1;
    private static final int COLUMN_OFFSET = 1;
    private static final int DEPENDENCIES_LENGTH = 15; // the length of "</dependencies>"
    private static final int PROJECT_LENGTH = 10; // the length of "</projects>"
    private String targetDependency;

    List<String> dependenciesList = new ArrayList<>();
    String groupId;
    String artifactId;
    Stack<String> nodes = new Stack<>();

    public PosInfo getPosInfo() {
        return posInfo;
    }

    @Override
    public void setDocumentLocator(Locator locator) {
        this.locator = locator;
    }

    @Override
    public void startElement(String uri, String localName, String qName, Attributes attributes) throws SAXException {
        nodes.push(qName);
    }

    @Override
    public void characters(char[] ch, int start, int length) throws SAXException {
        final String content = new String(ch, start, length);
        if (isInArtifactIdNode()) {
            groupId = content;
        } else if (isInGroupIdNode()) {
            artifactId = content;
        }
    }

    private boolean isInDependencyNode() {
        return nodes.contains("dependency");
    }

    private boolean isInGroupIdNode() {
        return isInDependencyNode() && "groupId".equals(nodes.peek());
    }

    private boolean isInArtifactIdNode() {
        return isInDependencyNode() && "artifactId".equals(nodes.peek());
    }

    @Override
    public void endElement(String uri, String localName, String qName) throws SAXException {
        String top = null;
        while (!nodes.empty() && !StringUtils.equals(top, qName)) {
            top = nodes.pop();
        }
        // post process
        switch(qName) {
            case "dependencies":
                if (!nodes.empty() && "project".equals(nodes.peek())) {
                    posInfo.alreadyHasDependencies = true;
                    posInfo.pos = new Position(locator.getLineNumber() - LINE_OFFSET,
                        locator.getColumnNumber() - COLUMN_OFFSET - DEPENDENCIES_LENGTH);
                }
                break;
            case "project":
                if (posInfo.pos == null){
                    posInfo.pos = new Position(locator.getLineNumber() - LINE_OFFSET,
                        locator.getColumnNumber() - COLUMN_OFFSET - PROJECT_LENGTH);
                }
                break;
            case "dependency":
                dependenciesList.add(groupId + ":" + artifactId);
                groupId = artifactId = "";
                break;
        }
    }

    @Override
    public void endDocument() throws SAXException {
        if (dependenciesList.contains(targetDependency)) {
            posInfo.needAddDependency = false;
        }
    }

    public void setTargetDependency(String targetDependency) {
        this.targetDependency = targetDependency;
    }
}
