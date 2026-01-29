CREATE TABLE IF NOT EXISTS graphs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS topics (
  id SERIAL PRIMARY KEY,
  graph_id INTEGER NOT NULL REFERENCES graphs(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_graph_id ON topics(graph_id);
CREATE INDEX IF NOT EXISTS idx_topics_title ON topics(title);
