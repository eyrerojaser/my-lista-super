import { OPENAI, internalKey, makePhoto } from "../lib/dish-image.mjs";

// Crea la foto de una receta con OpenAI. Corre "en segundo plano" (hasta 15 minutos), porque crear
// una foto tarda más de lo que permite una función normal. Solo la llama el servidor (/api/ai).
export default async (req) => {
  if (req.method !== "POST" || !OPENAI()) return;
  if (req.headers.get("x-np-key") !== internalKey()) return;
  let b; try { b = await req.json(); } catch { return; }
  const list = Array.isArray(b.photos) ? b.photos.slice(0, 4) : [];
  await Promise.all(list.map(p => makePhoto({
    id: String(p.id || "").replace(/[^a-f0-9]/g, "").slice(0, 24),
    title: String(p.title || "").slice(0, 90),
    look: String(p.look || "").slice(0, 300),
    ingredients: (Array.isArray(p.ingredients) ? p.ingredients : []).map(x => String(x).slice(0, 40)).slice(0, 8),
  }).catch(e => console.error("foto", e.message))));
};
