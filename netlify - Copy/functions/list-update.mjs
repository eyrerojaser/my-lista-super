import { store, validCode, cleanItems, json, readBody, MAX_ITEMS } from "../lib/list-store.mjs";

// Guarda solo lo que cambió. Si dos teléfonos guardan al mismo tiempo, se reintenta para no perder ningún cambio.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const body = await readBody(req);
  if (!body || !validCode(body.code)) return json({ error: "Código inválido" }, 400);
  const set = cleanItems(body.set);
  const del = Array.isArray(body.del) ? body.del.filter(k => typeof k === "string").slice(0, MAX_ITEMS) : [];
  const s = store(), key = "lists/" + body.code;
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await s.getWithMetadata(key, { type: "json" });
    if (!cur || !cur.data) return json({ error: "not-found" }, 404);
    const doc = cur.data;
    doc.items = doc.items || {};
    Object.assign(doc.items, set);
    del.forEach(k => { delete doc.items[k]; });
    if (Object.keys(doc.items).length > MAX_ITEMS) return json({ error: "Demasiados productos" }, 413);
    doc.v = (doc.v || 0) + 1;
    doc.updated = Date.now();
    const res = await s.setJSON(key, doc, { onlyIfMatch: cur.etag });
    if (!res || res.modified !== false) return json({ ok: true, v: doc.v });
    await new Promise(r => setTimeout(r, 40 + Math.random() * 120)); // otro teléfono guardó justo antes: se vuelve a intentar
  }
  return json({ error: "Ocupado, intenta de nuevo" }, 503);
};
export const config = { path: "/api/list-update" };
