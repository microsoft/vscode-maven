// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

package com.microsoft.java.maven.handler;

import org.eclipse.core.runtime.IProgressMonitor;
import org.eclipse.jdt.ls.core.internal.IDelegateCommandHandler;

import java.util.List;
import java.util.Objects;

@SuppressWarnings("restriction")
public class DelegateCommandHandler implements IDelegateCommandHandler {
    
    @Override
    public Object executeCommand(String commandId, List<Object> arguments, IProgressMonitor monitor) throws Exception {
        if (Objects.equals(commandId, "java.maven.hello")) {
            return "Hello World from jdtls-ext";
        }
        return null;
    }
}
