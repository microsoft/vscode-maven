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
import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.core.ICompilationUnit;
import org.eclipse.jdt.core.JavaModelException;
import org.eclipse.jdt.core.dom.CompilationUnit;
import org.eclipse.jdt.core.dom.rewrite.ImportRewrite;
import org.eclipse.jdt.core.manipulation.CodeStyleConfiguration;
import org.eclipse.jdt.core.refactoring.CompilationUnitChange;
import org.eclipse.jdt.internal.core.manipulation.dom.ASTResolving;
import org.eclipse.jdt.ls.core.internal.ChangeUtil;
import org.eclipse.jdt.ls.core.internal.JDTUtils;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;
import org.eclipse.lsp4j.WorkspaceEdit;
import org.xml.sax.Attributes;
import org.xml.sax.Locator;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.DefaultHandler;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AddDependencyHandler {

    public static class AddDependencyParams {

        final String fullClassName;
        final String artifactInfo; // gid:aid:version
        final String uri;
        final int line;
        final int character;
        final int length;

        public AddDependencyParams(String fullClassName, String artifactInfo, 
                String uri, int line, int character, int length) {
            this.fullClassName = fullClassName;
            this.artifactInfo = artifactInfo;
            this.uri = uri;
            this.line = line;
            this.character = character;
            this.length = length;
        }
    }

    private static WorkspaceEdit importEdit(AddDependencyParams params, 
            ICompilationUnit unit, CompilationUnit astRoot) {
        // import the new class
        final CompilationUnitChange cuChange = new CompilationUnitChange("", unit);
        final ImportRewrite importRewrite = CodeStyleConfiguration.createImportRewrite(astRoot, true);
        importRewrite.addImport(params.fullClassName);
        try {
            cuChange.setEdit(importRewrite.rewriteImports(null));
            return ChangeUtil.convertToWorkspaceEdit(cuChange);
        } catch (CoreException e) {
            return new WorkspaceEdit();
        }
    }

    private static WorkspaceEdit replaceEdit(AddDependencyParams params, ICompilationUnit unit) {
        // replace old class name with new one
        try {
            final Map<String, List<TextEdit>> textEdits = new HashMap<>();
            textEdits.put(unit.getCorrespondingResource().getLocationURI().toString(),
                    Arrays.asList(new TextEdit(new Range(new Position(params.line, params.character), 
                    new Position(params.line, params.character + params.length)), 
                    params.fullClassName.substring(params.fullClassName.lastIndexOf('.') + 1))));
            return new WorkspaceEdit(textEdits);
        } catch (JavaModelException e) {
            return new WorkspaceEdit();
        }
    }

    private static PosInfo getPosInfo(String pomPath, String targetDependency) {
        PosInfo posInfo = null;
        final SAXParserFactory factory = SAXParserFactory.newInstance();
        try {
            final SAXParser parser = factory.newSAXParser();
            final XMLReader reader = parser.getXMLReader();
            final GetPosHandler posHandler = new GetPosHandler();
            posHandler.setTargetDependency(targetDependency);
            reader.setContentHandler(posHandler);
            reader.parse(pomPath);
            posInfo = posHandler.getPosInfo();
            return posInfo;
        } catch (SAXException | IOException | ParserConfigurationException e) {
            return null;
        }
    }

    private static WorkspaceEdit pomEdit(AddDependencyParams params, ICompilationUnit unit) {
        IPath path = null;
        try {
            path = unit.getJavaProject().getCorrespondingResource().getLocation().append("pom.xml");
            final String info[] = params.artifactInfo.replaceAll(" ", "").split(":");
            if (info.length < 3) {
                return new WorkspaceEdit();
            }
            final PosInfo posInfo = getPosInfo(path.toString(), info[0] + ":" + info[1]);
            final String linesep = System.lineSeparator(); 
            String newtext = "";
            final String pomUriString = unit.getJavaProject().getCorrespondingResource()
                    .getLocationURI().toString() + "/pom.xml";
            final Map<String, List<TextEdit>> textEdits = new HashMap<>();

            if (posInfo != null) {
                if (posInfo.needAddDependency == false) {
                    textEdits.put(pomUriString, new ArrayList<TextEdit>());
                } else if (posInfo.alreadyHasDependencies == false) {
                    final int space = 2;
                    newtext = linesep + StringUtils.repeat(" ", space) + "<dependencies>" + linesep + 
                            StringUtils.repeat(" ", space + 2) + "<dependency>" + linesep + 
                            StringUtils.repeat(" ", space + 4) + "<groupId>" + info[0] + "</groupId>" + 
                            linesep + StringUtils.repeat(" ", space + 4) + "<artifactId>" + info[1] + 
                            "</artifactId>" + linesep + StringUtils.repeat(" ", space + 4) + "<version>" + 
                            info[2] + "</version>" + linesep + StringUtils.repeat(" ", space + 2) + "</dependency>" + 
                            linesep + StringUtils.repeat(" ", space) + "</dependencies>" + linesep;
                    textEdits.put(pomUriString, 
                        Arrays.asList(new TextEdit(new Range(posInfo.pos, posInfo.pos), newtext)));
                } else {
                    final int space = posInfo.pos.getCharacter();
                    newtext = linesep + StringUtils.repeat(" ", space + 2) + "<dependency>" + linesep + 
                        StringUtils.repeat(" ", space + 4) + "<groupId>" + info[0] + "</groupId>" + linesep + 
                        StringUtils.repeat(" ", space + 4) + "<artifactId>" + info[1] + "</artifactId>" + 
                        linesep + StringUtils.repeat(" ", space + 4) + "<version>" + info[2] + "</version>" + 
                        linesep + StringUtils.repeat(" ", space + 2) + "</dependency>" + linesep + 
                        StringUtils.repeat(" ", space);
                    textEdits.put(pomUriString, 
                        Arrays.asList(new TextEdit(new Range(posInfo.pos, posInfo.pos), newtext)));
                }
                return new WorkspaceEdit(textEdits);
            } else {
                return new WorkspaceEdit();
            }
        } catch (JavaModelException e) {
            return new WorkspaceEdit();
        }
    }

    public static List<WorkspaceEdit> addDependency(AddDependencyParams params, IProgressMonitor monitor) {
        final ICompilationUnit unit = JDTUtils.resolveCompilationUnit(params.uri);
        final CompilationUnit astRoot = ASTResolving.createQuickFixAST(unit, null);
        return Arrays.asList(replaceEdit(params, unit), importEdit(params, unit, astRoot), 
                            pomEdit(params, unit));
    }
}

class GetPosHandler extends DefaultHandler {
    private Locator locator;
    private PosInfo posInfo = new PosInfo();
    private final static int LINE_OFFSET = 1;
    private final static int COLUMN_OFFSET = 1;
    private final static int DEPENDENCIES_LENGTH = 15; // the length of "</dependencies>"
    private final static int PROJECT_LENGTH = 10; // the length of "</projects>"
    private String targetDependency;

    List<String> dependenciesList = new ArrayList<>(); 
    Boolean inDependency = false;
    Boolean inGroupId = false;
    Boolean inArtifactId = false;
    String groupId;
    String artifactId;

    public PosInfo getPosInfo() {
        return posInfo;
    }

    @Override
    public void setDocumentLocator(Locator locator) {
        this.locator = locator;
    }

    @Override
    public void startElement(String uri, String localName, String qName, Attributes attributes) throws SAXException {
        switch (qName) {
            case "dependency":
                inDependency = true;
                break;
            case "groupId":
                inGroupId = true;
                break;
            case "artifactId":
                inArtifactId = true;
                break;
        }
    }

    @Override
    public void characters(char[] ch, int start, int length) throws SAXException {
        final String content = new String(ch, start, length);
        if (inDependency) {
            if (inGroupId) {
                groupId = content;
            } else if (inArtifactId) {
                artifactId = content;
            }
        }
    }

    @Override
    public void endElement(String uri, String localName, String qName) throws SAXException {
        switch(qName) {
            case "dependencies":
                posInfo.alreadyHasDependencies = true;
                posInfo.pos = new Position(locator.getLineNumber() - LINE_OFFSET, 
                    locator.getColumnNumber() - COLUMN_OFFSET - DEPENDENCIES_LENGTH);
                break;
            case "project":
                if (posInfo.pos == null){
                    posInfo.pos = new Position(locator.getLineNumber() - LINE_OFFSET, 
                        locator.getColumnNumber() - COLUMN_OFFSET - PROJECT_LENGTH);
                }
                break;
            case "dependency":
                inDependency = false;
                dependenciesList.add(groupId + ":" + artifactId);
                groupId = artifactId = "";
                break;
            case "groupId":
                inGroupId = false;
                break;
            case "artifactId":
                inArtifactId = false;
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

class PosInfo {
    Position pos = null;
    Boolean alreadyHasDependencies = false;
    Boolean needAddDependency = true;
}
