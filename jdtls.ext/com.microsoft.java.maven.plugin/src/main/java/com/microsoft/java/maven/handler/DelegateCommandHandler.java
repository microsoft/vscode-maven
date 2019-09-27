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

package com.microsoft.java.maven.handler;

import com.microsoft.java.maven.AddDependencyHandler;
import com.microsoft.java.maven.ArtifactSearcher;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.ls.core.internal.IDelegateCommandHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@SuppressWarnings("restriction")
public class DelegateCommandHandler implements IDelegateCommandHandler {
    
    @Override
    public Object executeCommand(String commandId, List<Object> arguments, IProgressMonitor monitor) throws Exception {
        if (Objects.equals(commandId, "java.maven.initializeSearcher")) {
            ArtifactSearcher.initialize((String) arguments.get(0));
        } else if (Objects.equals(commandId, "java.maven.searchArtifact")) {
            final Map<String, Object> param = (Map<String, Object>) arguments.get(0);
            if (param.get("searchType").equals("CLASSNAME")) {
                return ArtifactSearcher.searchByClassName((String) param.get("className"), monitor);
            } else if (param.get("searchType").equals("IDENTIFIER")) {
                return ArtifactSearcher.searchByIdentifier(
                    (String) param.get("groupId"), (String) param.get("artifactId"), monitor
                );
            } else {
                return new ArrayList<>();
            }
        } else if (Objects.equals(commandId, "java.maven.addDependency")) {
            final AddDependencyHandler.AddDependencyParams params = new AddDependencyHandler.AddDependencyParams(
                (String) arguments.get(0), 
                (String) arguments.get(1), 
                (String) arguments.get(2), 
                ((Double) arguments.get(3)).intValue(), 
                ((Double) arguments.get(4)).intValue(), 
                ((Double) arguments.get(5)).intValue()
            );
            return AddDependencyHandler.addDependency(params, monitor);
        } else if (Objects.equals(commandId, "java.maven.controlContext")) {
            return ArtifactSearcher.controlIndexerContext((boolean) arguments.get(0), monitor);
        } 
        return null;
    }

}
