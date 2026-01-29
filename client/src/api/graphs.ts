import { api } from "./client";
import type {
  GraphListItem,
  GraphResponse,
  RelatedResponse,
  UpdateTopicsResponse,
} from "../types/graph";

export const graphsApi = {
  list: () => api<{ graphs: GraphListItem[]; error?: string }>("/graphs"),
  get: (id: number | null) => api<{ graphData: GraphResponse, error?: string }>(`/graphs/${id}`),
  create: (payload: { name: string; topics: string[] }) =>
    api<{ graphId: number; error?: string }>("/graphs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  rename: (id: number, name: string) =>
    api<{ graph: GraphListItem; error?: string }>(`/graphs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  updateTopics: (id: number, topics: string[]) =>
    api<UpdateTopicsResponse>(`/graphs/${id}/topics`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics }),
    }),
  related: (graphId: number, topicId: number) =>
    api<RelatedResponse>(`/graphs/${graphId}/topics/${topicId}/related`),
  delete: (id: number) =>
    api<{ graphId: number; error?: string }>(`/graphs/${id}`, {
      method: "DELETE",
    }),
};
