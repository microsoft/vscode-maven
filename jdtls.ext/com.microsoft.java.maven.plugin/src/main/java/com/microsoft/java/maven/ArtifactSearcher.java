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

import com.microsoft.java.maven.ArtifactResult;
import com.microsoft.java.maven.NetResponseResult.Info;
import com.microsoft.java.maven.NetResponseResult.fullClassNameList;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.google.gson.stream.JsonReader;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.apache.commons.text.similarity.LevenshteinDistance;
import org.apache.lucene.search.BooleanClause.Occur;
import org.apache.lucene.search.BooleanQuery;
import org.apache.lucene.search.Query;
import org.apache.maven.index.ArtifactInfo;
import org.apache.maven.index.DefaultIndexer;
import org.apache.maven.index.DefaultIndexerEngine;
import org.apache.maven.index.DefaultQueryCreator;
import org.apache.maven.index.DefaultSearchEngine;
import org.apache.maven.index.FlatSearchRequest;
import org.apache.maven.index.FlatSearchResponse;
import org.apache.maven.index.Indexer;
import org.apache.maven.index.MAVEN;
import org.apache.maven.index.context.IndexCreator;
import org.apache.maven.index.context.IndexingContext;
import org.apache.maven.index.creator.JarFileContentsIndexCreator;
import org.apache.maven.index.creator.MinimalArtifactInfoIndexCreator;
import org.apache.maven.index.expr.UserInputSearchExpression;
import org.eclipse.core.runtime.IProgressMonitor;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

public class ArtifactSearcher {

    private static ClassSearcher classSearcher = null;
    private static final String contextId = "indexer";
    private static final String repositoryId = "repo";
    private static String extensionPath;
    private static final String index = "index";
    private static final String artifactUsage = "ArtifactUsage.json";

    public static void initialize(String path){
        extensionPath = path;
    }
    
    public static List<ArtifactResult> searchByClassName(String className, IProgressMonitor monitor) {
        if (classSearcher == null) {
            try {
                String indexPath = Paths.get(extensionPath, index).toString();
                String artifactUsagePath = Paths.get(extensionPath, artifactUsage).toString();
                classSearcher = new ClassSearcher(contextId, repositoryId, indexPath, artifactUsagePath);
            } catch (Exception e) {
                classSearcher = null;
                e.printStackTrace();
            }
        }
        try {
            className = className.toLowerCase();
            return classSearcher.searchByClassName(className);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public static Boolean controlIndexerContext(Boolean controlParam, IProgressMonitor monitor) {
        if(classSearcher==null){
            return true;
        } else{
            return classSearcher.controlIndexerContext(controlParam);
        }
    }
}

class ClassSearcher {
    private BaseClassSearcher mavenSearcher;
    private NetSearcher netSearcher;
    private Map<String, Integer> artifactUsageDict;
    private final int fuzzyResultThreshold = 1000;
    private final Set<String> azureSet = new HashSet<>();

    private final String contextId;
    private final String repositoryId;
    private final String indexPath;
    private final String artifactUsagePath;

    {
        final String azureArtifacts[] = { "adal4j", "azure-mgmt-appservice", "applicationinsights-web", 
            "azure-batch", "azure-mgmt-batchai", "azure-mgmt-cdn", "azure-mgmt-containerinstance",
            "azure-cognitiveservices-computervision", "azure-cognitiveservices-videosearch", 
            "azure-cognitiveservices-parent", "azure-cognitiveservices-websearch", 
            "azure-cognitiveservices-customimagesearch", "azure-cognitiveservices-visualsearch",
            "azure-cognitiveservices-newssearch", "azure-cognitiveservices-customsearch", 
            "azure-cognitiveservices-autosuggest", "azure-cognitiveservices-spellcheck", 
            "azure-cognitiveservices-faceapi", "azure-cognitiveservices-contentmoderator", 
            "azure-computervision", "azure-cognitiveservices-luis-runtime", "azure-faceapi", 
            "azure-cognitiveservices-entitysearch", "azure-cognitiveservices-imagesearch",
            "azure-cognitiveservices-textanalytics", "azure-cognitiveservices-language", 
            "azure-cognitiveservices-luis-authoring", "azure-cognitiveservices-customvision-training", 
            "azure-cognitiveservices-customvision-prediction",
            "azure-mgmt-containerregistry", "azure-mgmt-containerservice", "azure-documentdb", 
            "azure-mgmt-datalake-analytics", "azure-data-lake-store-sdk", "azure-mgmt-dns", "azure-svc-mgmt", 
            "azure-eventgrid", "azure-eventhubs", "azure-functions-java-library", "azure-client-authentication", 
            "azure-arm-client-runtime", "azure-mgmt-hdinsight", "iot-service-client", "azure-keyvault", 
            "azure-mgmt-mixedreality", "azure-mgmt-labservices", "azure-mgmt-monitor", "azure-mgmt-network", 
            "azure-mgmt-privatedns", "azure-mgmt-redis", "azure-mgmt-resources", "azure-mgmt-resourcegraph", 
            "azure-servicebus", "sf", "azure-mgmt-streamanalytics", "mssql-jdbc", "azure-storage-blob", 
            "azure-storage-queue", "azure-mgmt-trafficmanager", "azure-mgmt-compute", "azure", "azure-core", };
        azureSet.addAll(Arrays.asList(azureArtifacts));
    }

    private static Comparator<ArtifactResult> orderByRule = new Comparator<ArtifactResult>() {
        @Override
        public int compare(ArtifactResult r1, ArtifactResult r2) {
            if (r1.getKind() < r2.getKind() || (r1.getKind() == r2.getKind() && r1.getUsage() > r2.getUsage()) || 
                    (r1.getKind() == r2.getKind() && r1.getUsage() == r2.getUsage() && 
                    r1.getClassName().toLowerCase().compareTo(r2.getClassName().toLowerCase()) < 0)) {
                return -1;
            } else if (r2.getKind() < r1.getKind() || (r2.getKind() == r1.getKind() && 
                    r2.getUsage() > r1.getUsage()) || 
                    (r2.getKind() == r1.getKind() && r2.getUsage() == r1.getUsage() && 
                    r2.getClassName().toLowerCase().compareTo(r1.getClassName().toLowerCase()) < 0)) {
                return 1;
            } else {
                return 0;
            }
        }
    };

    public ClassSearcher(String contextId, String repositoryId, String indexPath, String artifactUsagePath) {
        this.contextId = contextId;
        this.repositoryId = repositoryId;
        this.indexPath = indexPath;
        this.artifactUsagePath = artifactUsagePath;
        constructMavenSearcher();
        constructNetSearcher();
    }

    private Boolean constructMavenSearcher() {
        try {
            artifactUsageDict = new Gson().fromJson(new JsonReader(new FileReader(artifactUsagePath)), 
                    new TypeToken<HashMap<String, Integer>>() {
                    }.getType());
            mavenSearcher = new BaseClassSearcher(contextId, repositoryId, indexPath);
            return true;
        } catch (Exception e) {
            if (mavenSearcher != null) {
                mavenSearcher.turnOffIndexerContext();
            }
            mavenSearcher = null;
            artifactUsageDict = null;
            e.printStackTrace();
            return false;
        }
    }

    private Boolean constructNetSearcher() {
        try {
            this.netSearcher = new NetSearcher();
            return true;
        } catch (Exception e) {
            this.netSearcher = null;
            e.printStackTrace();
            return false;
        }
    }

    public List<ArtifactResult> searchByClassName(String className)  {
        Map<String, ArtifactResult> r1 = mavenSearcher != null ?
                mavenSearcher.searchByClassName(className) : new HashMap<>();
        if (r1.size() < 5 && netSearcher != null) {
            final Map<String, ArtifactResult> r2 = netSearcher.searchByClassName(className);
            r2.putAll(r1); // r1 will override r2 if necessary
            r1 = r2;
        }
        final List<ArtifactResult> result = new ArrayList<>(r1.values());
        final List<ArtifactResult> azureResult = new ArrayList<>();
        for (final ArtifactResult r : result) {
            final String id = r.getGroupId() + ":" + r.getArtifactId();
            if (artifactUsageDict.containsKey(id)) {
                r.setUsage(artifactUsageDict.get(r.getGroupId() + ":" + r.getArtifactId()));
            } else {
                r.setUsage(0);
            }

            if (azureSet.contains(r.getArtifactId())) {
                azureResult.add(r);
            }
        }
        // filter
        final Iterator<ArtifactResult> it = result.iterator();
        while (it.hasNext()) {
            final ArtifactResult r = it.next();
            if (r.getKind() == ArtifactResult.FUZZY && r.getUsage() < fuzzyResultThreshold) {
                it.remove();
            }
        }

        Collections.sort(result, orderByRule); // Top-k instead?
        final int starNums = (int) Math.min(Math.round(result.size() / 5.0), 5);
        if (!azureResult.isEmpty()) {
            final ArtifactResult ar = Collections.min(azureResult, orderByRule);
            if (starNums > 1 && !result.subList(0, starNums).contains(ar)) {
                result.remove(ar);
                result.add(starNums - 1, ar);
            }
        }
        Collections.sort(result.subList(starNums, result.size()), new Comparator<ArtifactResult>() {
            @Override
            public int compare(ArtifactResult r1, ArtifactResult r2) {
                return r1.getClassName().toLowerCase().compareTo(r2.getClassName().toLowerCase());
            }
        });
        return result;
    }

    public Boolean controlIndexerContext(Boolean controlParam) {
        if (controlParam == true) {
            return mavenSearcher == null ? constructMavenSearcher() : mavenSearcher.turnOnIndexerContext();
        } else {
            return mavenSearcher == null ? true : mavenSearcher.turnOffIndexerContext();
        }
    }
}

abstract class MavenSearcher {

    protected final Indexer indexer;
    protected final String contextId;
    protected final String repositoryId;
    protected final String indexPath;
    protected final List<IndexCreator> indexers;
    protected IndexingContext indexerContext;

    //  protected static Comparator<Result> versionComparator = new Comparator<Result>() {
    //      @Override
    //      public int compare(Result r1, Result r2) {
    //
    //          try {
    //              Version v1 = versionScheme.parseVersion(r1.getVersion());
    //              Version v2 = versionScheme.parseVersion(r2.getVersion());
    //              return v2.compareTo(v1); //reverse order
    //          } catch (InvalidVersionSpecificationException e) {
    //              e.printStackTrace();
    //              return 1;
    //          }
    //      }
    //  };

    //  private static GenericVersionScheme versionScheme = new GenericVersionScheme();

    public MavenSearcher(String contextId, String repositoryId, String indexPath) throws IOException {

        this.indexer = new DefaultIndexer(new DefaultSearchEngine(), 
                new DefaultIndexerEngine(), new DefaultQueryCreator());

        this.contextId = contextId;
        this.repositoryId = repositoryId;
        this.indexPath = indexPath;

        indexers = new ArrayList<>();
        indexers.add(new MinimalArtifactInfoIndexCreator());
        indexers.add(new JarFileContentsIndexCreator());
    }

    @Override
    protected void finalize() throws IOException {
        indexer.closeIndexingContext(indexerContext, false);
    }
}

class BaseClassSearcher extends MavenSearcher {

    private LevenshteinDistance editDistanceCalculator = new LevenshteinDistance();

    public BaseClassSearcher(String contextId, String repositoryId, String indexPath) throws IOException {
        super(contextId, repositoryId, indexPath);
        this.indexerContext = indexer.createIndexingContext(contextId, repositoryId, null, 
                new File(indexPath), null, null, true, true, indexers);
    }

    public Map<String, ArtifactResult> searchByClassName(String className) {
        if (indexerContext == null) {
            return new HashMap<>();
        }
        // UserInputSearchExpression supports prefix search in nature
        // ~ enables fuzzy search with maximal edit distances 2
        final Query q = indexer.constructQuery(MAVEN.CLASSNAMES, new UserInputSearchExpression(className + "~"));
        final BooleanQuery bq = new BooleanQuery.Builder().add(q, Occur.MUST).build();
        try {
            final List<ArtifactResult> result = search(bq, className);
            final Map<String, ArtifactResult> resultMap = new HashMap<>();
            for (final ArtifactResult r : result) {
                if (!resultMap.containsKey(r.getFullClassName())) {
                    resultMap.put(r.getFullClassName(), r);
                }
            }
            return resultMap;
        } catch (IOException e) {
            return new HashMap<>();
        }
    } 

    private List<ArtifactResult> search(Query q, String queryClassname) throws IOException {
        final FlatSearchResponse response;
        response = indexer.searchFlat(new FlatSearchRequest(q, indexerContext));

        final List<ArtifactResult> resultList = new ArrayList<>();
        for (final ArtifactInfo r : response.getResults()) {
            final String[] fullClassnameList = r.getClassNames().split("\n");
            for (String fullClassname : fullClassnameList) {
                fullClassname = fullClassname.substring(1).replaceAll("/", ".");
                final int matchKind = isMatch(fullClassname, queryClassname);
                if (matchKind == ArtifactResult.PREFIX) {
                    resultList.add(new ArtifactResult(r.getGroupId(), r.getArtifactId(), r.getVersion(), 
                            fullClassname.substring(fullClassname.lastIndexOf(".") + 1), 
                            fullClassname, -1, ArtifactResult.PREFIX));
                } else if (matchKind == ArtifactResult.FUZZY) {
                    resultList.add(new ArtifactResult(r.getGroupId(), r.getArtifactId(), r.getVersion(), 
                            fullClassname.substring(fullClassname.lastIndexOf(".") + 1), 
                            fullClassname, -1, ArtifactResult.FUZZY));
                }
            }
        }
        return resultList;
    }

    private int isMatch(String fullClassName, String queryClassName) {
        final String fc = fullClassName.substring(fullClassName.lastIndexOf(".") + 1).toLowerCase();
        final String qc = queryClassName.indexOf('.') != -1 ? 
                queryClassName.substring(queryClassName.lastIndexOf(".") + 1).toLowerCase() : queryClassName;
        if (fc.startsWith(qc)) {
            return ArtifactResult.PREFIX;
        } else if (fc.length() >= qc.length() && editDistanceCalculator.apply(fc, qc) <= 2) {
            //(fc.substring(0, 1).equals(qc.substring(0, 1)) || 
            //fc.substring(fc.length() - 1).equals(qc.substring(qc.length() - 1))) &&
            return ArtifactResult.FUZZY;
        } else {
            return 0;
        }
    }

    public Boolean turnOnIndexerContext() {
        if (indexerContext == null) {
            try {
                indexerContext = indexer.createIndexingContext(contextId, repositoryId, null, 
                        new File(indexPath), null, null, true, true, indexers);
                return true;
            } catch (IOException | IllegalArgumentException e) {
                indexerContext = null;
                return false;
            }
        }
        return true;
    }

    public Boolean turnOffIndexerContext() {
        if (indexerContext == null) {
            return true;
        }
        try {
            indexer.closeIndexingContext(indexerContext, false);
            indexerContext = null;
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}

class NetSearcher {

    private OkHttpClient client;
    private final String urlPrefix;
    private final String urlSuffix;
    private final int maxResult;

    public NetSearcher() {
        client = new OkHttpClient.Builder().readTimeout(2, TimeUnit.SECONDS).build(); //timeout: 2 seconds
        urlPrefix = "https://search.maven.org/solrsearch/select?q=";
        urlSuffix = "&rows=10&wt=json";
        maxResult = 5;
    }

    public Map<String, ArtifactResult> searchByClassName(String className) {
        final String exactSearchUrl;
        final String prefixSearchUrl;
        if (className.indexOf('.') != -1) {
            exactSearchUrl = urlPrefix + "fc:" + className + urlSuffix;
            prefixSearchUrl = urlPrefix + "fc:" + className + "*" + urlSuffix;
        } else {
            exactSearchUrl = urlPrefix + "c:" + className + urlSuffix;
            prefixSearchUrl = urlPrefix + "c:" + className + "*" + urlSuffix;
        }

        final Request exactRequest = new Request.Builder().url(exactSearchUrl).build();
        final Request prefixRequest = new Request.Builder().url(prefixSearchUrl).build();

        final CountDownLatch latch = new CountDownLatch(2);

        final String[] exactResponse = new String[] { "" };
        final String[] prefixResponse = new String[] { "" };

        client.newCall(exactRequest).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                latch.countDown();
            }

            @Override
            public void onResponse(Call call, Response response) {
                try {
                    exactResponse[0] = response.body().string();
                } catch (IOException e) {
                }
                latch.countDown();
            }
        });

        client.newCall(prefixRequest).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                latch.countDown();
            }

            @Override
            public void onResponse(Call call, Response response) {
                try {
                    prefixResponse[0] = response.body().string();
                } catch (IOException e) {
                }
                latch.countDown();
            }
        });

        try {
            latch.await();
        } catch (InterruptedException e) {
            return new HashMap<>();
        }

        return processResponse(exactResponse[0], prefixResponse[0], className);
    }

    private Map<String, ArtifactResult> processResponse(String exactResponse, String prefixResponse, 
            String queryClassName) {
        final Map<String, ArtifactResult> resultMap = new HashMap<>();

        if (!exactResponse.isEmpty()) {
            final NetResponseResult exactResult = new Gson().fromJson(exactResponse, NetResponseResult.class);
            addResult(exactResult, resultMap, queryClassName, ArtifactResult.PREFIX);
        }
        if (!prefixResponse.isEmpty()) {
            final NetResponseResult prefixResult = new Gson().fromJson(prefixResponse, NetResponseResult.class);
            addResult(prefixResult, resultMap, queryClassName, ArtifactResult.PREFIX);
        }

        return resultMap;
    }

    private void addResult(NetResponseResult responseResult, Map<String, ArtifactResult> resultMap, 
            String queryClassName, int kind) {
        if (resultMap.size() >= maxResult) {
            return;
        }
        final Map<String, fullClassNameList> consultMap = responseResult.getHighlighting();
        for (final Info info : responseResult.getResponse().getDocs()) {
            final String id = info.getId();
            if (consultMap.containsKey(id)) {
                final List<String> fullClassNames = consultMap.get(id).getFch();
                for (String fullClassName : fullClassNames) {
                    fullClassName = fullClassName.replaceAll("<em>", "").replaceAll("</em>", "");
                    if (!resultMap.containsKey(fullClassName) && isMatch(fullClassName, queryClassName)) {
                        resultMap.put(fullClassName, new ArtifactResult(info.getG(), info.getA(), info.getV(), 
                            fullClassName.substring(fullClassName.lastIndexOf('.') + 1), fullClassName, -1, kind));
                        if (resultMap.size() >= maxResult) {
                            return;
                        }
                    }
                }
            }
        }
    }

    private Boolean isMatch(String fullClassName, String queryClassName) {
        final String fc = fullClassName.substring(fullClassName.lastIndexOf(".") + 1).toLowerCase();
        final String qc = queryClassName.indexOf('.') != -1 ? 
                queryClassName.substring(queryClassName.lastIndexOf(".") + 1).toLowerCase() : queryClassName;
        return fc.startsWith(qc);
    }
}
