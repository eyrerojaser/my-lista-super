import { readSession, json } from "../lib/auth-core.mjs";
import { store, MAX_PHOTO, MAX_PHOTOS, PHOTO_ID, photoPrefix, photoIds } from "../lib/backup-core.mjs";

// Fotos de los recibos de Mis Compras, guardadas en la cuenta.
// GET  /api/user-photo?id=…   (Authorization: Bearer <sesión>) → la imagen
// PUT  /api/user-photo?id=…   (Authorization: Bearer <sesión>, cuerpo = imagen JPEG)
export default async (req) => {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const user = await readSession(token);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!PHOTO_ID.test(id)) return json({ error: "Foto inválida" }, 400);
  const s = store(), key = photoPrefix(user.uid) + id;

  if (req.method === "GET") {
    const buf = await s.get(key, { type: "arrayBuffer" });
    if (!buf) return json({ error: "No existe" }, 404);
    return new Response(buf, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
  }
  if (req.method === "PUT") {
    const type = req.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Foto inválida" }, 400);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_PHOTO) return json({ error: "La foto es demasiado grande" }, 413);
    const ids = await photoIds(user.uid);
    if (!ids.includes(id) && ids.length >= MAX_PHOTOS) return json({ error: "Llegaste al máximo de fotos guardadas" }, 413);
    await s.set(key, buf);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
};
export const config = { path: "/api/user-photo" };
