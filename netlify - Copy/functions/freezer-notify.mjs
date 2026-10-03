import webpush from "web-push";
import { store, vapidKeys } from "../lib/store.mjs";
import { dueItems, buildMessage } from "../lib/freezer-core.mjs";

// Se ejecuta sola cada hora y envía los avisos de 3 días antes.
export default async () => {
  const s = store();
  const keys = await vapidKeys();
  webpush.setVapidDetails(process.env.URL || "mailto:avisos@example.com", keys.publicKey, keys.privateKey);

  const { blobs } = await s.list({ prefix: "subs/" });
  let sentCount = 0;
  for (const { key } of blobs) {
    const rec = await s.get(key, { type: "json" });
    if (!rec || !rec.subscription) continue;
    const due = dueItems(rec);
    if (!due.length) continue;
    try {
      await webpush.sendNotification(rec.subscription, JSON.stringify(buildMessage(due)), { TTL: 60 * 60 * 12 });
      rec.sent = rec.sent || {};
      due.forEach(i => { rec.sent[i.id + "|" + i.date] = Date.now(); });
      await s.setJSON(key, rec);
      sentCount++;
    } catch (err) {
      // El teléfono canceló los avisos o desinstaló la app: se borra.
      if (err && (err.statusCode === 404 || err.statusCode === 410)) await s.delete(key);
      else console.error("push error", err && err.statusCode, err && (err.body || err.message));
    }
  }
  console.log(`Freezer Scan: ${sentCount} avisos enviados`);
};

export const config = { schedule: "@hourly" };
