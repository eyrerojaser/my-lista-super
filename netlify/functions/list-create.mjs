import { store, validCode, cleanItems, json, readBody, MAX_ITEMS } from "../lib/list-store.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const body = await readBody(req);
  if (!body || !validCode(body.code)) return json({ error: "Código inválido" }, 400);
  const items = cleanItems(body.items);
  if (Object.keys(items).length > MAX_ITEMS) return json({ error: "Demasiados productos" }, 413);
  const res = await store().setJSON("lists/" + body.code, { v: 1, items, created: Date.now(), updated: Date.now() }, { onlyIfNew: true });
  if (res && res.modified === false) return json({ error: "Ya existe" }, 409);
  return json({ ok: true, v: 1 });
};
export const config = { path: "/api/list-create" };
