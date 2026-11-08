import { getStore } from "@netlify/blobs";
import { readSession, json } from "../lib/auth-core.mjs";

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
        .map(i => ({ name: clean(i.name, 60), days: Number.isFinite(+i.days) ? Math.round(+i.days) : null, place: clean(i.place, 12) }))
        .filter(i => i.name);
      if (!items.length) return json({ error: "empty" }, 400);
      if (!(await useQuota(user.uid))) return json({ error: "limit" }, 429);
      const list = items.map(i => "- " + i.name + (i.days !== null ? " (" + (i.days < 0 ? "expired" : i.days + " days left") + ")" : "") + (i.place ? " [" + i.place + "]" : "")).join("\n");
      const out = await claude([{ type: "text", text:
        "You are a friendly home cook helping a family use what they have before it goes bad. Food at home:\n" + list + "\n\n" +
        "Suggest 3 easy home recipes. Use first the items with the fewest days left. Assume basic staples (salt, oil, spices, rice, onion, garlic) are available. " +
        "Do not use items marked expired. Write everything in " + (en ? "English" : "Spanish (Latin American, warm and simple)") + ". " +
        "Keep steps short (max 6 steps). " +
        'Answer ONLY with JSON: {"recipes":[{"title":"","time":"25 min","uses":["item from the list"],"extra":["other ingredients needed"],"steps":["..."]}]}' }], 2000);
      const recipes = (Array.isArray(out.recipes) ? out.recipes : []).slice(0, 4).map(r => ({
        title: clean(r.title, 90), time: clean(r.time, 20),
        uses: (Array.isArray(r.uses) ? r.uses : []).slice(0, 10).map(x => clean(x, 50)).filter(Boolean),
        extra: (Array.isArray(r.extra) ? r.extra : []).slice(0, 10).map(x => clean(x, 50)).filter(Boolean),
        steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 8).map(x => clean(x, 240)).filter(Boolean),
      })).filter(r => r.title && r.steps.length);
      return json({ recipes });
    }
  } catch (e) {
    return json({ error: "fail" }, 502);
  }
  return json({ error: "Acción desconocida" }, 400);
};
export const config = { path: "/api/ai" };
