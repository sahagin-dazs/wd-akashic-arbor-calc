import type { LineupData, LineupDocument } from "../models/lineupList";

const DEFAULT_API_BASE = "/api";
const FALLBACK_API_BASE = "https://wdtools-api.azurewebsites.net/api";

function resolveApiBase() {
  const explicit = import.meta.env.VITE_API_BASE;
  if (explicit) return explicit;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "wdtoolbox.com" || host === "localhost" || host === "127.0.0.1") {
      return FALLBACK_API_BASE;
    }
  }
  return DEFAULT_API_BASE;
}

const API_BASE = resolveApiBase();

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* noop */
    }
    const message = parsed?.error || res.statusText || "Request failed";
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function createLineup(payload: {
  title: string;
  data: LineupData;
}): Promise<LineupDocument & { editToken: string }> {
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchLineup(id: string): Promise<LineupDocument> {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function updateLineup(payload: {
  id: string;
  editToken: string;
  title: string;
  data: LineupData;
}): Promise<LineupDocument> {
  const { id, editToken, ...rest } = payload;
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-edit-token": editToken
    },
    body: JSON.stringify(rest)
  });
  return handleResponse(res);
}
