import webpush from "web-push";
import { store, vapidKeys } from "../lib/store.mjs";
import { subId, validSubscription, validTz, sanitizeItems } from "../lib/freezer-core.mjs";

// Recibe la lista del freezer de un teléfono para poder avisarle aunque la app esté cerrada.
export default async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });
  const text = await req.text();
  if (text.length > 100000) return new Response("Demasiado grande", { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return new Response("JSON inválido", { status: 400 }); }
  if (!validSubscription(body.subscription)) return new Response("Suscripción inválida", { status: 400 });

  const s = store();
  const key = "subs/" + subId(body.subscription.endpoint);
  const items = sanitizeItems(body.items);
  const prev = (await s.get(key, { type: "json" })) || {};
  const live = new Set(items.map(i => i.id + "|" + i.date));
  const sent = Object.fromEntries(Object.entries(prev.sent || {}).filter(([k]) => live.has(k)));

  const rec = {
    subscription: {
      endpoint: body.subscription.endpoint,
      keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth },
    },
    tz: validTz(body.tz) ? body.tz : "America/Chicago",
    items, sent, updated: Date.now(), lastTest: prev.lastTest || 0,
  };
  const keys = await vapidKeys();
  // Aviso de prueba (botón de la campana): se envía en ese momento para comprobar que llegan.
  let test;
  if (body.test === true) {
    if (Date.now() - rec.lastTest < 20000) test = "wait";
    else {
      rec.lastTest = Date.now();
      try {
        webpush.setVapidDetails(process.env.URL || "mailto:avisos@example.com", keys.publicKey, keys.privateKey);
        await webpush.sendNotification(rec.subscription, JSON.stringify({ title: "🔔 Aviso de prueba", body: "Así te llegarán los avisos 3 días antes de que algo se venza.", tag: "freezer-test", url: "./?freezer=1" }), { TTL: 600 });
        test = "sent";
      } catch (err) {
        console.error("push test error", err && err.statusCode, err && (err.body || err.message));
        test = err && (err.statusCode === 404 || err.statusCode === 410) ? "gone" : "error";
      }
    }
  }
  if (test === "gone") await s.delete(key);
  else await s.setJSON(key, rec);
  return Response.json({ ok: true, publicKey: keys.publicKey, test });
};

export const config = { path: "/api/freezer-sync" };
