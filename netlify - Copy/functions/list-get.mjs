import { store, validCode, json } from "../lib/list-store.mjs";

// Los teléfonos preguntan cada pocos segundos: si la lista no cambió (misma versión), la respuesta es corta.
export default async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code") || "";
  if (!validCode(code)) return json({ error: "Código inválido" }, 400);
  const doc = await store().get("lists/" + code, { type: "json" });
  if (!doc) return json({ error: "No existe" }, 404);
  const known = parseInt(u.searchParams.get("v") || "-1", 10);
  if (known === doc.v) return json({ same: true, v: doc.v });
  return json({ v: doc.v, items: doc.items || {} });
};
export const config = { path: "/api/list-get" };
