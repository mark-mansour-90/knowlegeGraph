import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import { similarityScore, normalize } from "./helpers/util";

const app = express();
app.use(express.json());

// Allow frontend dev server to call backend
app.use(cors({ origin: "http://localhost:5173" }));

// Single connection pool for the whole app
// Reason: creating a new connection per request is slow and can exceed DB limits.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ---------- API ----------
/**
 * Backend API expected:
 * - POST   /graphs
 * - GET    /graphs
 * - PUT    /graphs/:graphId
 * - PUT    /graphs/:graphId/topics
 * - DELETE /graphs/:graphId
 * - GET    /graphs/:graphId
 * - GET    /graphs/:graphId/topics/:topicId/related
 */

app.get("/health", async (_req, res) => {
  const r = await pool.query("SELECT NOW() as now");
  res.json({ ok: true, now: r.rows[0].now });
});

/**
 * POST /graphs
 * Body: { name: string, topics: string[] }
 *
 * What it does:
 * 1) Creates a graph row
 * 2) Inserts topics as nodes
 * 3) Computes all topic pairs and inserts edges with score
 */
app.post("/graphs", async (req, res) => {
  const { name, topics } = req.body as { name?: string; topics?: string[] };

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }
  if (!Array.isArray(topics) || topics.length < 1) {
    return res.status(400).json({ error: "topics must be an array of at least 1 string" });
  }

  // Clean topics: trim, remove empties, remove duplicates
  const cleaned = Array.from(
    new Set(
      topics
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0)
    )
  );

  if (cleaned.length < 1) {
    return res.status(400).json({ error: "need at least 1 non-empty unique topic" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) Create graph
    const graphRes = await client.query(
      "INSERT INTO graphs (name) VALUES ($1) RETURNING id, name, created_at",
      [name.trim()]
    );
    const graph = graphRes.rows[0];
    const graphId = graph.id as number;

    // 2) Insert topics (nodes) and keep their IDs
    const topicIdByTitle = new Map<string, number>();

    for (const title of cleaned) {
      const tRes = await client.query(
        "INSERT INTO topics (graph_id, title) VALUES ($1, $2) RETURNING id",
        [graphId, title]
      );
      topicIdByTitle.set(title, tRes.rows[0].id);
    }

    await client.query("COMMIT");
    res.status(201).json({ graphId });
  } catch (e: any) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "failed to create graph" });
  } finally {
    client.release();
  }
});

/**
 * GET /graphs
 * Returns all graphs
 */
app.get("/graphs", async (_req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, created_at
       FROM graphs
       ORDER BY created_at DESC`
    );
    res.json({ graphs: r.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list graphs" });
  }
});

/**
 * PUT /graphs/:graphId
 * Renames a graph
 */
app.put("/graphs/:graphId", async (req, res) => {
  const graphId = Number(req.params.graphId);
  const { name } = req.body as { name?: string };

  if (!Number.isFinite(graphId)) return res.status(400).json({ error: "Invalid graphId" });
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const r = await pool.query(
      `UPDATE graphs SET name = $1 WHERE id = $2 RETURNING id, name, created_at`,
      [name.trim(), graphId]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Graph not found" });
    res.json({ graph: r.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to rename graph" });
  }
});

/**
 * PUT /graphs/:graphId/topics
 * Body: { topics: string[] }
 * Replaces the topics for a graph
 */
app.put("/graphs/:graphId/topics", async (req, res) => {
  const graphId = Number(req.params.graphId);
  const { topics } = req.body as { topics?: string[] };

  if (!Number.isFinite(graphId)) return res.status(400).json({ error: "Invalid graphId" });
  if (!Array.isArray(topics) || topics.length < 1) {
    return res.status(400).json({ error: "topics must be a non-empty array" });
  }

  // Clean + de-dupe (case-insensitive)
  const cleaned = Array.from(
    new Set(
      topics
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0)
        .map((t) => t.toLowerCase()) // for dedupe
    )
  );

  // We still want original casing for display:
  // simplest: rebuild with first seen casing from input
  const casingMap = new Map<string, string>();
  for (const t of topics) {
    const tt = (t || "").trim();
    if (!tt) continue;
    const key = tt.toLowerCase();
    if (!casingMap.has(key)) casingMap.set(key, tt);
  }
  const finalTopics = cleaned.map((k) => casingMap.get(k)!).filter(Boolean);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure graph exists
    const g = await client.query(`SELECT id FROM graphs WHERE id = $1`, [graphId]);
    if (g.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Graph not found" });
    }

    // Delete old topics for this graph
    // (edges table is gone, so no extra cleanup)
    await client.query(`DELETE FROM topics WHERE graph_id = $1`, [graphId]);

    // Insert new topics
    for (const title of finalTopics) {
      await client.query(`INSERT INTO topics (graph_id, title) VALUES ($1, $2)`, [graphId, title]);
    }

    await client.query("COMMIT");

    // Return updated nodes for convenience
    const nodesRes = await pool.query(
      `SELECT id, title FROM topics WHERE graph_id = $1 ORDER BY id ASC`,
      [graphId]
    );
    res.json({ graphId, topics: nodesRes.rows });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    res.status(500).json({ error: "Failed to update topics" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /graphs/:graphId
 * Deletes a graph and its associated topics
 */
app.delete("/graphs/:graphId", async (req, res) => {
  const graphId = Number(req.params.graphId);
  if (!Number.isFinite(graphId)) return res.status(400).json({ error: "Invalid graphId" });

  try {
    const r = await pool.query(`DELETE FROM graphs WHERE id = $1 RETURNING id`, [graphId]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Graph not found" });
    return res.json({ graphId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to delete graph" });
  }
});

/**
 * GET /graphs/:graphId
 * Returns the graph with nodes
 */
app.get("/graphs/:graphId", async (req, res) => {
  const graphId = Number(req.params.graphId);

  const graphRes = await pool.query("SELECT id, name, created_at FROM graphs WHERE id = $1", [
    graphId,
  ]);
  if (graphRes.rowCount === 0) return res.status(404).json({ error: "graph not found" });

  const nodesRes = await pool.query(
    "SELECT id, title FROM topics WHERE graph_id = $1 ORDER BY id ASC",
    [graphId]
  );

  res.json({
    graphData: {
      graph: graphRes.rows[0],
      nodes: nodesRes.rows,
    }
  });
});

/**
 * GET /graphs/:graphId/topics/:topicId/related
 * Returns neighbors of a topic sorted by score (for "click node" details)
 */
app.get("/graphs/:graphId/topics/:topicId/related", async (req, res) => {
  const graphId = Number(req.params.graphId);
  const topicId = Number(req.params.topicId);

  try {
    // 1) Fetch the current topic title for this graph/topic
    const curRes = await pool.query<{ title: string }>(
      "SELECT title FROM topics WHERE id = $1 AND graph_id = $2",
      [topicId, graphId]
    );

    if (curRes.rowCount === 0) {
      return res.status(404).json({ error: "Topic not found in this graph" });
    }
    // 2) Fetch candidate topics from OTHER graphs
    // We keep it broad for simplicity; for better performance you can add filtering later.
    const currentTitle = curRes.rows[0].title;
    const candidatesRes = await pool.query<{
      id: number;
      graph_id: number;
      title: string;
    }>(
      `
      SELECT id, graph_id, title
      FROM topics
      WHERE graph_id <> $1
      `,
      [graphId]
    );
  
    // 3) Compute scores, then group by label and count frequency
    type Acc = {
      id: number;
      title: string;
      occurrences: number;    // how many graphs/topics matched this label
      maxSimilarity: number;  // best similarity observed for this label
    };

    const map = new Map<string, Acc>();

    for (const row of candidatesRes.rows) {
      const sim = similarityScore(currentTitle, row.title);

      // Optional threshold to avoid noise
      // If you want "spider" to match "spider man", keep threshold low (e.g. 0.2)
      if (sim <= 0) continue;

      const key = normalize(row.title); // group case-insensitively

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          id: row.id,
          title: row.title, // keep original title for display
          occurrences: 1,
          maxSimilarity: sim,
        });
      } else {
        existing.occurrences += 1;
        if (sim > existing.maxSimilarity) {
          existing.maxSimilarity = sim; 
        }
      }
    }
  
    // 4) Turn grouped results into an array and compute final score
    // Your requirement: "count all findings and give 1 for identical topic found in other graph"
    // We'll do: finalScore = maxSimilarity * occurrences
    // (You can normalize later if it gets too large.)
    const results = Array.from(map.values())
      .map((x) => ({
        id: x.id,
        title: x.title,
        occurrences: x.occurrences,
        similarity: Number(x.maxSimilarity.toFixed(4)),
        score: Number((x.maxSimilarity * x.occurrences).toFixed(4)),
        reason:
          x.maxSimilarity === 1
            ? `identical match found in ${x.occurrences} other graph(s)`
            : `partial match; best similarity=${x.maxSimilarity.toFixed(2)} found in ${x.occurrences} other graph(s)`,
      }))
      // sort by final score desc, then similarity desc
      .sort((a, b) => b.score - a.score || b.similarity - a.similarity)
      .slice(0, 20);

    return res.json({
      topic: { id: topicId, title: currentTitle },
      related: results,
    });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: "Failed to compute related topics" });
  }
});

app.listen(Number(process.env.PORT) || 4000, () => {
  console.log(`API on http://localhost:${process.env.PORT || 4000}`);
});