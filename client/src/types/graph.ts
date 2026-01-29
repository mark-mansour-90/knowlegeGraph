export type GraphMeta = {
  id: number;
  name: string;
  created_at: string;
};

export type DbNode = {
  id: number;
  title: string;
};

export type GraphResponse = {
  graph: GraphMeta;
  nodes: DbNode[];
};

export type GraphListItem = {
  id: number;
  name: string;
  created_at: string;
};

export type UpdateTopicsResponse = {
  graphId: number;
  topics: Array<{ id: number; title: string }>;
  error?: string;
};

export type RelatedItem = {
  title: string;
  occurrences: number;
  similarity: number;
  score: number;
  reason: string;
};

export type RelatedResponse = {
  topic: { id: number; title: string };
  related: RelatedItem[];
  error?: string;
};

// Types used by react-force-graph
export type FGNode = {
  id: number;
  title: string;
  x?: number;
  y?: number;
};

export type FGLink = {
  id: string;
  source: number | FGNode;
  target: number | FGNode;
  score: number;
  reason: string;
};

export type FGData = {
  nodes: FGNode[];
  links: FGLink[];
};
