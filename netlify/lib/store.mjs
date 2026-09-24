import { getStore } from "@netlify/blobs";
import webpush from "web-push";

export const store = () => getStore("freezer-scan");

// Claves para enviar avisos: se crean solas la primera vez y se guardan en el sitio.
export async function vapidKeys() {
  const s = store();
  let keys = await s.get("config/vapid", { type: "json" });
  if (keys) return keys;
  const fresh = webpush.generateVAPIDKeys();
  await s.setJSON("config/vapid", fresh, { onlyIfNew: true });
  return (await s.get("config/vapid", { type: "json" })) || fresh;
}
