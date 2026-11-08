import { photoStore, photoState } from "../lib/dish-image.mjs";

// Entrega la foto de una receta. Si todavía se está creando, responde {state:"working"} y la app vuelve a preguntar.
export default async (req) => {
  const id = (new URL(req.url).searchParams.get("id") || "").replace(/[^a-f0-9]/g, "").slice(0, 24);
  if (id.length !== 24) return new Response(JSON.stringify({ state: "none" }), { status: 400, headers: { "Content-Type": "application/json" } });
  const state = await photoState(id);
  if (state === "ready") {
    const buf = await photoStore().get("img/" + id, { type: "arrayBuffer" });
    if (buf) return new Response(buf, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  }
  return new Response(JSON.stringify({ state: state || "none" }), { status: 202, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
};
export const config = { path: "/api/recipe-photo" };
