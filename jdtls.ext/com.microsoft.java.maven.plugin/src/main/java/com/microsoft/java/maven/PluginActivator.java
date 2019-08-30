// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

package com.microsoft.java.maven;

import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

public class PluginActivator implements BundleActivator {

    public static final String PLUGIN_ID = "com.microsoft.java.maven.plugin";
    public static BundleContext context = null;

    @Override
    public void start(BundleContext context) throws Exception {
        PluginActivator.context = context;
    }

    @Override
    public void stop(BundleContext context) throws Exception {
    }

}
