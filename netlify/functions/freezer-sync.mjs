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

  await s.setJSON(key, {
    subscription: {
      endpoint: body.subscription.endpoint,
      keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth },
    },
    tz: validTz(body.tz) ? body.tz : "America/Chicago",
    items, sent, updated: Date.now(),
  });
  const { publicKey } = await vapidKeys();
  return Response.json({ ok: true, publicKey });
};

export const config = { path: "/api/freezer-sync" };
