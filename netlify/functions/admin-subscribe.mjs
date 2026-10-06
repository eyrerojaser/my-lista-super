import { createHash } from "node:crypto";
import { store, json, readBody } from "../lib/auth-core.mjs";
import { adminPasswordOk, notifyAdmins } from "../lib/admin-notify.mjs";

// Activa (o quita) los avisos de administración en el teléfono de la dueña.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  if (!adminPasswordOk(b.password)) { await new Promise(r => setTimeout(r, 800)); return json({ error: "Contraseña incorrecta" }, 401); }
  const sub = b.subscription;
  if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return json({ error: "Suscripción inválida" }, 400);
  const key = "admin-subs/" + createHash("sha256").update(sub.endpoint).digest("hex").slice(0, 40);
  if (b.remove) { await store().delete(key); return json({ ok: true, removed: true }); }
  await store().setJSON(key, { subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } }, created: Date.now() });
  if (b.test) await notifyAdmins("✅ Avisos activados", "Te avisaremos cuando alguien se registre o pida un código de contraseña.", "admin-test");
  return json({ ok: true });
};
export const config = { path: "/api/admin-subscribe" };
