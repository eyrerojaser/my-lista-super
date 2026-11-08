import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";

/* Fotos de las recetas creadas con IA (OpenAI). Se activan con la variable OPENAI_API_KEY en Netlify.
   La foto de cada plato se crea una sola vez y se guarda: si otra persona recibe la misma receta,
   se usa la misma foto sin volver a pagar. */
export const OPENAI = () => process.env.OPENAI_API_KEY || "";
const IMG_MODEL = () => process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const IMG_QUALITY = () => process.env.OPENAI_IMAGE_QUALITY || "medium";
const DAILY = () => Math.max(1, +(process.env.AI_PHOTOS_DAILY || 300)); // fotos nuevas al día en toda la app

export const photoStore = () => getStore({ name: "recetas-ia-fotos", consistency: "strong" });
export const photoId = title => createHash("sha256").update(String(title).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()).digest("hex").slice(0, 24);
// Clave interna para que solo el servidor pueda pedir fotos nuevas (sale de la misma OPENAI_API_KEY).
export const internalKey = () => createHash("sha256").update("nopencil-photo:" + OPENAI()).digest("hex");

// Estado de la foto: "ready", "working" o null (no existe todavía).
export async function photoState(id) {
  const s = photoStore();
  const st = await s.get("s/" + id, { type: "json" }).catch(() => null);
  if (!st) return null;
  if (st.state === "working" && Date.now() - st.at > 4 * 60_000) return null; // se quedó a medias
  if (st.state === "error" && Date.now() - st.at > 30 * 60_000) return null;   // reintentar más tarde
  return st.state;
}

async function underDailyCap() {
  const s = photoStore(), key = "day/" + new Date().toISOString().slice(0, 10);
  const n = (await s.get(key, { type: "json" }).catch(() => 0)) || 0;
  if (n >= DAILY()) return false;
  await s.setJSON(key, n + 1);
  return true;
}

export async function makePhoto({ id, title, look, ingredients }) {
  const s = photoStore();
  if ((await photoState(id)) === "ready") return;
  if (!(await underDailyCap())) { await s.setJSON("s/" + id, { state: "error", at: Date.now(), why: "cap" }); return; }
  await s.setJSON("s/" + id, { state: "working", at: Date.now() });
  const prompt =
    "Realistic professional food photograph of a home-cooked dish: " + title + ". " +
    (look ? look + ". " : "") +
    (ingredients && ingredients.length ? "Main ingredients visible: " + ingredients.slice(0, 6).join(", ") + ". " : "") +
    "Freshly plated and appetizing, served on a simple ceramic plate or bowl on a warm wooden kitchen table, soft natural window light, " +
    "shallow depth of field, 45-degree angle, true-to-life colors and textures, magazine cookbook style. " +
    "No text, no letters, no logos, no brand packaging, no people, no hands.";
  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Authorization": "Bearer " + OPENAI(), "Content-Type": "application/json" },
      body: JSON.stringify({ model: IMG_MODEL(), prompt, n: 1, size: "1536x1024", quality: IMG_QUALITY(), output_format: "jpeg", output_compression: 82 }),
    });
    const d = await r.json().catch(() => ({}));
    const b64 = d && d.data && d.data[0] && d.data[0].b64_json;
    if (!r.ok || !b64) throw new Error("openai " + r.status + " " + JSON.stringify(d.error || d).slice(0, 300));
    await s.set("img/" + id, Buffer.from(b64, "base64"), { metadata: { title: String(title).slice(0, 90), at: Date.now() } });
    await s.setJSON("s/" + id, { state: "ready", at: Date.now() });
  } catch (e) {
    console.error("foto receta", e.message);
    await s.setJSON("s/" + id, { state: "error", at: Date.now() });
  }
}
