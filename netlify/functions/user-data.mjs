import { readSession, json } from "../lib/auth-core.mjs";
import { store, KEYS, MAX_DATA, dataKey, photoIds, photoPrefix, PHOTO_ID } from "../lib/backup-core.mjs";

// POST { token, op: "get" }                       → { data: { clave: { v, ts } }, photos: [ids] }
// POST { token, op: "put", data }                 → guarda cada parte si es más nueva que la guardada
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const text = await req.text();
  if (text.length > MAX_DATA + 20000) return json({ error: "Tus datos son demasiado grandes para la copia" }, 413);
  let b; try { b = JSON.parse(text || "{}"); } catch { return json({ error: "Datos inválidos" }, 400); }
  const user = await readSession(b.token);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  const s = store(), key = dataKey(user.uid);
  const saved = (await s.get(key, { type: "json" })) || { data: {} };

  if (b.op === "put") {
    const inc = b.data && typeof b.data === "object" ? b.data : {};
    let changed = false;
    for (const k of KEYS) {
      const e = inc[k];
      if (!e || typeof e.v !== "string" || typeof e.ts !== "number") continue;
      const cur = saved.data[k];
      // Si otro teléfono guardó algo más nuevo, no se pisa.
      if (!cur || e.ts > cur.ts) { saved.data[k] = { v: e.v, ts: Math.min(e.ts, Date.now() + 60000) }; changed = true; }
    }
    if (changed) {
      saved.updated = Date.now();
      if (JSON.stringify(saved).length > MAX_DATA) return json({ error: "Tus datos son demasiado grandes para la copia" }, 413);
      await s.setJSON(key, saved);
    }
    // Borra las fotos de recibos que ya no existen en Mis Compras (según lo guardado en la cuenta).
    if (changed && saved.data["purchases-v1"]) {
      let keep = new Set();
      try { keep = new Set(JSON.parse(saved.data["purchases-v1"].v).filter(r => r && r.photo && PHOTO_ID.test(r.id)).map(r => r.id)); } catch { keep = null; }
      if (keep) for (const id of await photoIds(user.uid)) if (!keep.has(id)) await s.delete(photoPrefix(user.uid) + id).catch(() => {});
    }
  }
  return json({ data: saved.data, updated: saved.updated || 0, photos: await photoIds(user.uid) });
};
export const config = { path: "/api/user-data" };
