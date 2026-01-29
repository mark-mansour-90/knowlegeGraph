export const API_BASE = "http://localhost:4000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  return res.json() as Promise<T>;
}
