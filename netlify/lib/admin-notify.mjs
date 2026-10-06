// Avisos para la dueña de la app: nueva cuenta registrada, código para cambiar contraseña.
import webpush from "web-push";
import { createHash, timingSafeEqual } from "node:crypto";
import { vapidKeys } from "./store.mjs";
import { store } from "./auth-core.mjs";

export function adminPasswordOk(given) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 10) return false;
  const a = createHash("sha256").update(String(given || "")).digest(), b = createHash("sha256").update(pass).digest();
  return timingSafeEqual(a, b);
}

export async function notifyAdmins(title, body, tag) {
  try {
    const s = store();
    const { blobs } = await s.list({ prefix: "admin-subs/" });
    if (!blobs.length) return 0;
    const keys = await vapidKeys();
    webpush.setVapidDetails(process.env.URL || "mailto:avisos@example.com", keys.publicKey, keys.privateKey);
    const payload = JSON.stringify({ title, body, tag: tag || "admin", url: "/admin.html" });
    let sent = 0;
    await Promise.all(blobs.map(async ({ key }) => {
      const rec = await s.get(key, { type: "json" });
      if (!rec || !rec.subscription) return;
      try { await webpush.sendNotification(rec.subscription, payload, { TTL: 60 * 60 * 24 }); sent++; }
      catch (err) { if (err && (err.statusCode === 404 || err.statusCode === 410)) await s.delete(key); }
    }));
    return sent;
  } catch { return 0; } // un aviso que falla nunca debe impedir un registro
}
