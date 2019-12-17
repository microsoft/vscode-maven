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

import org.eclipse.lsp4j.Position;

class PosInfo {
    Position pos = null;
    Boolean alreadyHasDependencies = false;
    Boolean needAddDependency = true;
}
