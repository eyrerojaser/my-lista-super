// Lista compartida guardada en Netlify Blobs (sin servicios externos).
import { getStore } from "@netlify/blobs";

export const store = () => getStore({ name: "listas-compartidas", consistency: "strong" });
export const MAX_ITEMS = 400;
export const validCode = c => typeof c === "string" && /^[A-Z0-9]{12}$/.test(c);
const validId = k => typeof k === "string" && k.length >= 1 && k.length <= 40 && /^[A-Za-z0-9_-]+$/.test(k);

export function cleanItems(obj) {
  const out = {};
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (!validId(k) || !v || typeof v !== "object") continue;
    if (JSON.stringify(v).length > 2000) continue;
    out[k] = v;
  }
  return out;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function readBody(req) {
  const t = await req.text();
  if (t.length > 400000) return null;
  try { return JSON.parse(t || "{}"); } catch { return null; }
}
