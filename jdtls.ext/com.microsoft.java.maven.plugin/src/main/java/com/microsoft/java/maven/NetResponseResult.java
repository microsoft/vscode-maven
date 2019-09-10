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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

public class NetResponseResult {
    Header responseHeader;
    Res response;
    HashMap<String, fullClassNameList> highlighting;

    public Res getResponse() {
        return this.response;
    }

    public HashMap<String, fullClassNameList> getHighlighting() {
        return this.highlighting;
    }

    public class Header {
        String status;
        String QTime;
        Params params;
    }

    public class Params {
        String q;
        String hlsnippets;
        String core;
        String hl;
        String indent;
        String fl;
        String start;
        String hlfl;
        String sort;
        String rows;
        String wt;
        String version;
    }

    public class Res {
        int numFound;
        int start;
        List<Info> docs;

        public List<Info> getDocs() {
            return this.docs;
        }
    }

    public class Info {
        String id;
        String g;
        String a;
        String v;
        String p;
        String timestamp;
        ArrayList<String> ec;
        ArrayList<String> tags;

        public String getId() {
            return this.id;
        }

        public String getG() {
            return this.g;
        }

        public String getA() {
            return this.a;
        }

        public String getV() {
            return this.v;
        }
    }
    public class fullClassNameList {
        ArrayList<String> fch;
        public ArrayList<String> getFch() {
            return this.fch;
        }
    }
}
