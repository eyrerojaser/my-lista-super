import { getStore } from "@netlify/blobs";
import { readSession, json } from "../lib/auth-core.mjs";
import { OPENAI, internalKey, photoId, photoState } from "../lib/dish-image.mjs";

// Funciones inteligentes de NoPencil (con la IA de Claude, de Anthropic):
//   · "list":    foto de una lista escrita en papel → productos para la lista
//   · "recipes": recetas con lo que hay en Freezer / Refri / Despensa (primero lo que está por vencer)
// Se activan al poner la variable ANTHROPIC_API_KEY en Netlify. Cada cuenta tiene un límite diario
// (AI_DAILY_LIMIT, 15 por defecto) para controlar el gasto.
const KEY = () => process.env.ANTHROPIC_API_KEY || "";
const MODEL = () => process.env.AI_MODEL || "claude-haiku-5-5";
const LIMIT = () => Math.max(1, +(process.env.AI_DAILY_LIMIT || 15));
const MAX_IMG = 4_000_000; // base64

async function useQuota(uid) {
  const s = getStore({ name: "ia-uso", consistency: "strong" });
  const day = new Date().toISOString().slice(0, 10), key = uid + "/" + day;
  const n = (await s.get(key, { type: "json" })) || 0;
  if (n >= LIMIT()) return false;
  await s.setJSON(key, n + 1);
  return true;
}

async function claude(content, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, messages: [{ role: "user", content }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("ai error", r.status, JSON.stringify(d).slice(0, 400)); throw new Error("ai " + r.status); }
  const text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("ai sin json");
  return JSON.parse(m[0]);
}

/* ---------- Fotos de platos (Wikipedia / Wikimedia Commons) ----------
   Se busca el artículo exacto del plato. Solo se usa su foto si el artículo es de comida
   (su descripción lo dice) y tiene imagen. Se guarda el autor y la licencia para darle crédito.
   Los resultados se guardan 30 días para no repetir búsquedas. */
const FOOD = /\b(dish|food|cuisine|soup|stew|salad|sandwich|bread|dessert|cake|pastry|pasta|sauce|snack|breakfast|taco|tortilla|casserole|meal|pie|porridge|curry|noodle|noodles|rice|omelette|egg|meat|chicken|beef|pork|fish|seafood|beverage|drink|cookie|pudding|dumpling|platillo|comida|plato|sopa|guiso)\b/i;
const UA = { "User-Agent": "NoPencil/1.0 (grocery list app; recipe photos)", "Accept": "application/json" };
async function dishPhoto(title) {
  const key = "w/" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
  const cache = getStore({ name: "recetas-fotos", consistency: "strong" });
  try {
    const hit = await cache.get(key, { type: "json" });
    if (hit && Date.now() - hit.at < 30 * 864e5) return hit.photo;
  } catch {}
  let photo = null;
  try {
    const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")) + "?redirect=true", { headers: UA });
    if (r.ok) {
      const d = await r.json();
      const img = (d.originalimage && d.originalimage.source) || (d.thumbnail && d.thumbnail.source) || "";
      const about = (d.description || "") + " " + (d.extract || "").slice(0, 300);
      if (d.type === "standard" && img && /^https:\/\/upload\.wikimedia\.org\//.test(img) && FOOD.test(about)) {
        // Versión de 800 px para el teléfono
        let src = (d.thumbnail && d.thumbnail.source) || img;
        src = src.replace(/\/(\d+)px-/, "/800px-");
        const file = decodeURIComponent((img.split("/").pop() || "")).replace(/^\d+px-/, "");
        let credit = "Wikimedia Commons", license = "", link = (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || "";
        try {
          const m = await fetch("https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=" + encodeURIComponent("File:" + file), { headers: UA });
          const md = await m.json();
          const page = md.query && md.query.pages && Object.values(md.query.pages)[0];
          const info = page && page.imageinfo && page.imageinfo[0];
          const ext = (info && info.extmetadata) || {};
          const strip = v => String((v && v.value) || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
          if (strip(ext.Artist)) credit = strip(ext.Artist).slice(0, 80);
          license = strip(ext.LicenseShortName).slice(0, 40);
          if (info && info.descriptionurl) link = info.descriptionurl;
        } catch {}
        photo = { src, credit, license, link, title: clean(d.title, 80) };
      }
    }
  } catch {}
  try { await cache.setJSON(key, { at: Date.now(), photo }); } catch {}
  return photo;
}

const clean = (s, n) => String(s || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

export default async (req) => {
  if (req.method === "GET") return json({ on: !!KEY() });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!KEY()) return json({ error: "off" }, 503);
  const text = await req.text();
  if (text.length > MAX_IMG + 20000) return json({ error: "La foto es demasiado grande" }, 413);
  let b; try { b = JSON.parse(text); } catch { return json({ error: "Datos inválidos" }, 400); }
  const user = await readSession(b.token);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  const en = b.lang === "en";

  try {
    if (b.action === "list") {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
      if (!m) return json({ error: "Foto inválida" }, 400);
      if (!(await useQuota(user.uid))) return json({ error: "limit" }, 429);
      const out = await claude([
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
        { type: "text", text:
          "This is a photo of a grocery shopping list, usually handwritten on paper. Read every item on it. " +
          "Fix spelling, keep each item in the language it was written in, put the first letter in uppercase, " +
          "leave out crossed-out items, and if a quantity is written (e.g. '2 leches', 'x3', '1 dozen eggs') put it in qty. " +
          "If the photo is not a shopping list, return an empty list. " +
          'Answer ONLY with JSON: {"items":[{"name":"Leche","qty":2}]}' },
      ], 1200);
      const items = (Array.isArray(out.items) ? out.items : []).slice(0, 80)
        .map(i => ({ name: clean(i.name, 80), qty: Math.max(1, Math.min(99, Math.round(+i.qty || 1))) }))
        .filter(i => i.name);
      return json({ items });
    }

    if (b.action === "recipes") {
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60)
        .map(i => ({ name: clean(i.name, 80), days: Number.isFinite(+i.days) ? Math.round(+i.days) : null, place: clean(i.place, 12) }))
        .filter(i => i.name);
      if (!items.length) return json({ error: "empty" }, 400);
      if (!(await useQuota(user.uid))) return json({ error: "limit" }, 429);
      const list = items.map(i => "- " + i.name + (i.days !== null ? " (" + (i.days < 0 ? "expired" : i.days + " days left") + ")" : "") + (i.place ? " [" + i.place + "]" : "")).join("\n");
      const lang = en ? "English" : "Spanish (Latin American, warm and simple)";
      const out = await claude([{ type: "text", text:
        "You are a professional home-cooking recipe writer helping a family use the food they have before it goes bad.\n" +
        "Their inventory (Freezer / Fridge / Pantry):\n" + list + "\n\n" +
        "Write 3 different, easy home recipes like a well-edited cookbook. Rules:\n" +
        "- Use first the items with the fewest days left. Never use items marked expired.\n" +
        "- Inventory names may be long store/brand names (e.g. 'HEB Whole Milk 1 Gal', 'Philadelphia Original Cream Cheese 8oz'). ALWAYS write them with their common name (milk, cream cheese, ham, ground beef) in the ingredients and steps, never the brand or package text. Keep only what matters to identify it (e.g. 'whole milk', 'cream cheese').\n" +
        "- Ingredients: exact quantities with units (US kitchen units: cup, tbsp, tsp, oz, lb, or units like '2 eggs'). Mark each ingredient: have=true if it comes from the inventory above, basic=true if it is a common pantry staple most homes have (salt, pepper, oil, water, sugar, flour, basic spices, garlic, onion), otherwise both false (the family must buy it).\n" +
        "- Steps: detailed, clear, one action per step, 5 to 9 steps, with temperatures and times when relevant.\n" +
        "- Tips: 1 to 3 short, genuinely useful cooking tips (substitutions, storage, how to know it is done). Empty list if none.\n" +
        "- prep_min and cook_min are whole minutes; servings is a number; difficulty is easy, medium or hard.\n" +
        "- photo_wiki: the exact English Wikipedia article title of this dish ONLY if it is a well-known, specific named dish with its own article (e.g. 'Chilaquiles', 'Fried rice', 'Shepherd\'s pie'); otherwise null. Never guess a title.\n" +
        "- emoji: one food emoji that represents the main ingredient.\n" +
        "- look: in English, one sentence describing what the finished plated dish looks like (colors, textures, garnish, serving dish), for a food photographer.\n" +
        "Write title, description, ingredient names, steps and tips in " + lang + ".\n" +
        'Answer ONLY with JSON: {"recipes":[{"title":"","description":"one or two sentences","emoji":"🍗","prep_min":10,"cook_min":25,"servings":4,"difficulty":"easy","ingredients":[{"name":"chicken breast","qty":"1","unit":"lb","have":true,"basic":false}],"steps":["..."],"tips":["..."],"look":"","photo_wiki":null}]}' }], 4000);
      const DIFF = { easy: 1, medium: 2, hard: 3 };
      const num = (v, lo, hi) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; };
      const recipes = (Array.isArray(out.recipes) ? out.recipes : []).slice(0, 4).map(r => ({
        title: clean(r.title, 90), description: clean(r.description, 260), emoji: clean(r.emoji, 8),
        prep: num(r.prep_min, 0, 600), cook: num(r.cook_min, 0, 900), servings: num(r.servings, 1, 24),
        difficulty: DIFF[String(r.difficulty || "").toLowerCase()] || null,
        ingredients: (Array.isArray(r.ingredients) ? r.ingredients : []).slice(0, 25).map(i => ({
          name: clean(i && i.name, 70), qty: clean(i && i.qty, 12), unit: clean(i && i.unit, 16), have: !!(i && i.have), basic: !!(i && i.basic) && !(i && i.have),
        })).filter(i => i.name),
        steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 12).map(x => clean(x, 400)).filter(Boolean),
        tips: (Array.isArray(r.tips) ? r.tips : []).slice(0, 4).map(x => clean(x, 240)).filter(Boolean),
        wiki: typeof r.photo_wiki === "string" ? clean(r.photo_wiki, 80) : "",
        look: clean(r.look, 300),
      })).filter(r => r.title && r.steps.length && r.ingredients.length);
      // Foto real del plato: solo si Wikipedia tiene un artículo de ese plato con su foto. Si no, la app muestra un diseño sin foto.
      if (OPENAI()) {
        // Foto creada con IA (OpenAI) para cada receta. Se crea en segundo plano y la app la muestra cuando está lista.
        const pending = [];
        await Promise.all(recipes.map(async r => {
          const id = photoId(r.title), st = await photoState(id).catch(() => null);
          r.aiPhoto = { id, ready: st === "ready" };
          if (!st) pending.push({ id, title: r.title, look: r.look, ingredients: r.ingredients.filter(i => !i.basic).map(i => i.name) });
        }));
        if (pending.length) {
          try {
            await fetch(new URL("/.netlify/functions/recipe-photo-background", req.url), {
              method: "POST", headers: { "Content-Type": "application/json", "x-np-key": internalKey() }, body: JSON.stringify({ photos: pending }),
            });
          } catch (e) { console.error("no se pudo pedir la foto", e.message); }
        }
        recipes.forEach(r => { r.photo = null; delete r.wiki; delete r.look; });
      } else {
        // Sin OpenAI: foto de Wikipedia si existe un artículo de ese plato.
        await Promise.all(recipes.map(async r => { r.photo = r.wiki ? await dishPhoto(r.wiki) : null; delete r.wiki; delete r.look; }));
      }
      return json({ recipes });
    }
  } catch (e) {
    return json({ error: "fail" }, 502);
  }
  return json({ error: "Acción desconocida" }, 400);
};
export const config = { path: "/api/ai" };
