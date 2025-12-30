import type { TierDocument, TierData } from "../models/tierList";

const DEFAULT_API_BASE = "/api";
const FALLBACK_API_BASE = "https://wdtools-api.azurewebsites.net/api";

function resolveApiBase() {
  const explicit = import.meta.env.VITE_API_BASE;
  if (explicit) return explicit;
  if (typeof window !== "undefined" && window.location.hostname === "wdtoolbox.com") {
    return FALLBACK_API_BASE;
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

export async function createTierList(payload: {
  title: string;
  data: TierData;
}): Promise<TierDocument & { editToken: string }> {
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return handleResponse(res);
}

export async function fetchTierList(id: string): Promise<TierDocument> {
  const res = await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`);
  return handleResponse(res);
}

export async function updateTierList(payload: {
  id: string;
  editToken: string;
  title: string;
  data: TierData;
}): Promise<TierDocument> {
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
