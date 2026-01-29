import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";

import GraphsList from "./components/GraphsList";
import GraphDetails from "./components/GraphDetails";
import { graphsApi } from "./api/graphs";
import { FGData, FGLink, FGNode, DbNode, GraphMeta, GraphListItem, RelatedItem } from "./types/graph";
import "./App.css";


export default function App() {
  // -----------------------------
  // Input state
  // -----------------------------
  const [graphName, setGraphName] = useState<string>("My Knowledge Graph");

  // Graphs list
  const [graphs, setGraphs] = useState<GraphListItem[]>([]);
  const [isLoadingGraphs, setIsLoadingGraphs] = useState(false);
  const [graphsError, setGraphsError] = useState("");
  const [isDeletingGraph, setIsDeletingGraph] = useState(false);
  const [deleteGraphError, setDeleteGraphError] = useState("");

  // Editor state
  const [editTopicsText, setEditTopicsText] = useState<string>("");
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [saveTopicsError, setSaveTopicsError] = useState("");

  const [renameText, setRenameText] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  // New graph creation topics
  const [topicsText, setTopicsText] = useState<string>(
    [
      "AI search",
      "SEO",
      "Marketing",
      "Press releases",
      "Brand visibility",
      "LLMs",
      "Content strategy",
    ].join("\n"),
  );
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>("");

  // -----------------------------
  // Loaded graph state
  // -----------------------------
  const [graphId, setGraphId] = useState<number | null>(null);
  const [graphMeta, setGraphMeta] = useState<GraphMeta | null>(null);
  const [nodes, setNodes] = useState<DbNode[]>([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>("");

  // -----------------------------
  // Selected node + related
  // -----------------------------
  const [selectedNode, setSelectedNode] = useState<FGNode | null>(null);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const [relatedError, setRelatedError] = useState<string>("");

  // Graph instance ref (for zoomToFit, centerAt, zoom)
  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(
    undefined,
  );

  // -----------------------------
  // Parse topics from textarea
  // -----------------------------
  const topicsList = useMemo<string[]>(() => {
    const lines = topicsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    // de-dupe case-insensitive while keeping order
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of lines) {
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    }
    return unique;
  }, [topicsText]);

  // -----------------------------
  // Build ForceGraph data
  // -----------------------------
  const graphData = useMemo<FGData>(() => {
    const fgNodes: FGNode[] = nodes.map((n) => ({ id: n.id, title: n.title }));
    return { nodes: fgNodes, links: [] };
  }, [nodes]);

  // -----------------------------
  // Create graph (POST /graphs)
  // -----------------------------
  async function handleCreateGraph(): Promise<void> {
    setCreateError("");
    setLoadError("");
    setRelatedError("");
    setSelectedNode(null);
    setRelated([]);

    if (!graphName.trim()) {
      setCreateError("Please enter a graph name.");
      return;
    }
    if (topicsList.length < 1) {
      setCreateError("Please enter at least 1 unique topic (one per line).");
      return;
    }

    setIsCreating(true);
    try {
      const res = await graphsApi.create({ name: graphName.trim(), topics: topicsList });

      if (!res.graphId) {
        throw new Error(res.error || "Failed to create graph.");
      }
      setGraphId(res.graphId);

      // Refresh graphs list so the new graph appears
      void refreshGraphs();
    } catch (e: any) {
      setCreateError(e?.message || "Failed to create graph.");
    } finally {
      setIsCreating(false);
    }
  }

  // -----------------------------
  // Save edited topics (PUT /graphs/:graphId/topics)
  // -----------------------------
  async function saveTopics(): Promise<void> {
    if (!graphId) return;

    setIsSavingTopics(true);
    setSaveTopicsError("");

    const topics = editTopicsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (topics.length < 1) {
      setSaveTopicsError("Please provide at least 1 topic.");
      setIsSavingTopics(false);
      return;
    }

    try {
      const res = await graphsApi.updateTopics(graphId, topics);

      if (!res.graphId) {
        throw new Error(res?.error || "Failed to save topics.");
      }

      // Update nodes in UI (topics changed)
      setNodes(res.topics);
      setSelectedNode(null);
      setRelated([]);
    } catch (e: any) {
      setSaveTopicsError(e?.message || "Failed to save topics.");
    } finally {
      setIsSavingTopics(false);
    }
  }

  // -----------------------------
  // Rename graph (PUT /graphs/:graphId)
  // -----------------------------
  async function renameGraph(): Promise<void> {
    if (!graphId) return;

    setIsRenaming(true);
    setRenameError("");

    if (!renameText.trim()) {
      setRenameError("Name cannot be empty.");
      setIsRenaming(false);
      return;
    }

    try {
      const res = await graphsApi.rename(graphId, renameText.trim());
      if (!res.graph) {
        throw new Error(res?.error || "Failed to rename graph.");
      }

      const updated = res.graph;
      setGraphMeta(updated);

      // Update graphs list row
      setGraphs((prev) => prev.map(g => (g.id === updated.id ? updated : g)));
    } catch (e: any) {
      setRenameError(e?.message || "Failed to rename graph.");
    } finally {
      setIsRenaming(false);
    }
  }

  // -----------------------------
  // Load list of graphs (GET /graphs)
  // -----------------------------
  async function refreshGraphs(): Promise<void> {
    setIsLoadingGraphs(true);
    setGraphsError("");

    try {
      const res = await graphsApi.list();
      if (!res.graphs) {
        throw new Error(res?.error || "Failed to load graphs.");
      }

      const data = res.graphs;
      setGraphs(data);
    } catch (e: any) {
      setGraphsError(e?.message || "Failed to load graphs.");
    } finally {
      setIsLoadingGraphs(false);
    }
  }

  // -----------------------------
  // Delete graph (DELETE /graphs/:graphId)
  // -----------------------------
  async function deleteGraph(id: number): Promise<void> {
    const graphToDelete = graphs.find((g) => g.id === id);
    const name = graphToDelete?.name ?? `#${id}`;

    const ok = window.confirm(`Delete graph "${name}"? This cannot be undone.`);
    if (!ok) return;

    setIsDeletingGraph(true);
    setDeleteGraphError("");

    try {
      const res = await graphsApi.delete(id);
      if (!res.graphId) {
        throw new Error(res?.error || "Failed to delete graph.");
      }

      // Remove from list immediately
      setGraphs((prev) => prev.filter((g) => g.id !== id));

      // If the currently opened graph was deleted, clear UI
      if (graphId === id) {
        setGraphId(null);
        setGraphMeta(null);
        setNodes([]);
        setSelectedNode(null);
        setRelated([]);
        setLoadError("");
        setRelatedError("");
        setEditTopicsText("");
        setRenameText("");
      }
    } catch (e: any) {
      setDeleteGraphError(e?.message || "Failed to delete graph.");
    } finally {
      setIsDeletingGraph(false);
    }
  }

  useEffect(() => {
    void refreshGraphs();
  }, []);

  // -----------------------------
  // Load graph when graphId changes (GET /graphs/:graphId)
  // -----------------------------
  useEffect(() => {
    if (!graphId) return;

    let cancelled = false;

    async function loadGraph(): Promise<void> {
      setIsLoadingGraph(true);
      setLoadError("");

      try {
        const res = await graphsApi.get(graphId);
        if (!res?.graphData?.graph?.id) {
          throw new Error(res?.error || "Failed to load graph.");
        }
        const data = res.graphData;
        if (cancelled) return;

        setGraphMeta(data.graph);
        setNodes(data.nodes);

        // Editor fields should reflect the loaded graph
        setEditTopicsText(data.nodes.map((n) => n.title).join("\n"));
        setRenameText(data.graph.name);
        setSelectedNode(null);
        setRelated([]);
        setRelatedError("");
        setTimeout(() => {
          const screenWidth = window.screen.width;
          fgRef.current?.centerAt(screenWidth / 6, 150);
        }, 300);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load graph.");
      } finally {
        if (!cancelled) setIsLoadingGraph(false);
      }
    }

    loadGraph();
    return () => {
      cancelled = true;
    };
  }, [graphId]);

  // -----------------------------
  // Load related topics (GET /graphs/:graphId/topics/:topicId/related)
  // -----------------------------
  async function loadRelated(node: FGNode): Promise<void> {
    if (!graphId) return;

    setIsLoadingRelated(true);
    setRelatedError("");
    setRelated([]);

    try {
      const res = await graphsApi.related(graphId, node.id);
      if (!res?.topic?.id) {
        throw new Error(res?.error || "Failed to load related topics.");
      }
      setRelated(res.related);
    } catch (e: any) {
      setRelatedError(e?.message || "Failed to load related topics.");
    } finally {
      setIsLoadingRelated(false);
    }
  }

  return (
    <div
      style={{
        fontFamily: "system-ui",
        padding: 16,
        margin: "0 auto",
      }}
    >
      <header
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={{ margin: 0 }}>Knowledge Graph Builder</h1>
          <p style={{ marginTop: 6, color: "#555" }}>
            Enter topics (one per line), generate a graph, then click a node to
            see related topics + scores.
          </p>
        </div>
      </header>

      {/* Input panel */}
      <section
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 12,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 10,
        }}
      >
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 280,
              flex: 1,
            }}
          >
            <span style={{ fontWeight: 600 }}>Graph name</span>
            <input
              value={graphName}
              onChange={(e) => setGraphName(e.target.value)}
              placeholder="e.g. Marketing Knowledge Graph"
              style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button
              onClick={handleCreateGraph}
              disabled={isCreating}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                color: "white",
                background: "#166050",
                cursor: isCreating ? "not-allowed" : "pointer",
                fontWeight: 600,
                opacity: isCreating ? 0.7 : 1,
              }}
            >
              {isCreating ? "Generating..." : "Generate Graph"}
            </button>

            <button
              onClick={() => {
                setGraphId(null);
                setGraphMeta(null);
                setNodes([]);
                setSelectedNode(null);
                setRelated([]);
                setCreateError("");
                setLoadError("");
                setRelatedError("");
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #ddd",
                color: "white",
                background: "#166050",
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>
            Topics (one per line) — {topicsList.length} unique
          </span>
          <textarea
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
            rows={6}
            placeholder={
              "AI search\nSEO\nMarketing\nPress releases\nBrand visibility"
            }
            style={{
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          />
        </label>

        {createError ? (
          <div style={{ color: "#b00020", fontWeight: 600 }}>{createError}</div>
        ) : null}
      </section>

      {/* Graphs table + editor */}
      <section
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* Graphs table */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 12,
            maxHeight: 385,
            overflowY: "auto",
          }}
        >
          <GraphsList
            graphs={graphs}
            graphId={graphId}
            isLoading={isLoadingGraphs}
            error={graphsError || deleteGraphError}
            onOpen={(id: number) => {
              setGraphId(id);
              setSelectedNode(null);
              setRelated([]);
            }}
            onDelete={(id: number) => deleteGraph(id)}
            isDeleting={isDeletingGraph}
          />
        </div>

        <GraphDetails
          graphId={graphId}
          isSavingTopics={isSavingTopics}
          renameText={renameText}
          setRenameText={setRenameText}
          isRenaming={isRenaming}
          renameError={renameError}
          renameGraph={renameGraph}
          editTopicsText={editTopicsText}
          setEditTopicsText={setEditTopicsText}
          saveTopics={saveTopics}
          saveTopicsError={saveTopicsError}
        />
      </section>

      {/* Main content */}
      <section
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* Graph */}
        <div
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            overflow: "hidden",
            minHeight: 520,
            maxWidth: "100%",
          }}
        >
          <div style={{ padding: 10, borderBottom: "1px solid #eee" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>
                  {graphMeta ? graphMeta.name : "No graph loaded"}
                </div>
                <div style={{ color: "#666", fontSize: 13 }}>
                  {graphMeta
                    ? `Graph ID: ${graphMeta.id}`
                    : "Generate a graph to visualize nodes."}
                </div>
              </div>
            </div>

            {isLoadingGraph ? (
              <div style={{ marginTop: 8, color: "#555" }}>
                Loading graph...
              </div>
            ) : null}
            {loadError ? (
              <div style={{ marginTop: 8, color: "#b00020", fontWeight: 600 }}>
                {loadError}
              </div>
            ) : null}
          </div>

          <div style={{ height: 520, maxWidth: "100%", }}>
            <ForceGraph2D<FGNode, FGLink>
              ref={fgRef}
              graphData={graphData}
              nodeLabel={(n: FGNode) => n.title}
              nodeRelSize={8}
              maxZoom={1.5}
              minZoom={0.2}
              linkWidth={(l: FGLink) => Math.max(1, (l.score || 0) * 6)}
              linkLabel={(l: FGLink) =>
                `score: ${Number(l.score).toFixed(2)}\n${l.reason || ""}`
              }
              onNodeClick={(node: FGNode) => {
                setSelectedNode(node);
                void loadRelated(node);
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside
          style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Details</div>

          {!graphId ? (
            <div style={{ color: "#666" }}>
              Generate a graph or select onefirst. Then click a node to see its related
              topics and scores.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ color: "#666", fontSize: 13 }}>
                  Selected topic
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {selectedNode ? selectedNode.title : "None"}
                </div>
              </div>

              {selectedNode ? (
                <>
                  {isLoadingRelated ? (
                    <div style={{ color: "#555" }}>
                      Loading related topics...
                    </div>
                  ) : null}
                  {relatedError ? (
                    <div style={{ color: "#b00020", fontWeight: 600 }}>
                      {relatedError}
                    </div>
                  ) : null}

                  {!isLoadingRelated &&
                  !relatedError &&
                  related.length === 0 ? (
                    <div style={{ color: "#666" }}>
                      No related topics found.
                    </div>
                  ) : null}

                  {related.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {related.map((r) => (
                        <div
                          key={r.title.toLowerCase()}
                          style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 10,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <div style={{ fontWeight: 700 }}>{r.title}</div>

                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontVariantNumeric: "tabular-nums",
                                  fontWeight: 800,
                                }}
                              >
                                {r.score.toFixed(2)}
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>
                                sim {r.similarity.toFixed(2)} • {r.occurrences}{" "}
                                match{r.occurrences === 1 ? "" : "es"}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              color: "#666",
                              fontSize: 13,
                              marginTop: 6,
                            }}
                          >
                            {r.reason || "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div style={{ color: "#666" }}>
                  Click a node in the graph to see relationships.
                </div>
              )}

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: "1px solid #eee",
                  color: "#555",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Graph stats
                </div>
                <div>Nodes: {nodes.length}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                  Tip: Click nodes to open the link map.
                </div>
              </div>
            </>
          )}
        </aside>
      </section>
    </div>
  );
}
