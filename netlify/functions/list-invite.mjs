import { getStore } from "@netlify/blobs";
import { readSession, emailKey, normEmail, validEmail, json, readBody } from "../lib/auth-core.mjs";
import { store as listStore, validCode } from "../lib/list-store.mjs";

/* Invitar a la lista compartida por el correo de la cuenta NoPencil de la otra persona.
   La invitación queda guardada para ese correo: cuando esa persona abre NoPencil (en cualquier teléfono),
   le aparece "X te invitó a su lista" y se une con un toque, sin códigos ni enlaces.
   op "send":  {token, code, email}  → guarda la invitación
   op "check": {token}               → invitaciones para la cuenta que abre la app
   op "clear": {token, code}         → borra esa invitación (aceptada o rechazada) */
const inv = () => getStore({ name: "invitaciones", consistency: "strong" });
const DAYS = 30;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const user = await readSession(b.token);
  if (!user) return json({ error: "Inicia sesión" }, 401);
  const fresh = list => (Array.isArray(list) ? list : []).filter(x => x && Date.now() - x.at < DAYS * 864e5);

  if (b.op === "send") {
    const email = normEmail(b.email), code = String(b.code || "");
    if (!validEmail(email)) return json({ error: "Correo inválido" }, 400);
    if (!validCode(code)) return json({ error: "Código inválido" }, 400);
    if (email === normEmail(user.email)) return json({ error: "self" }, 400);
    if (!(await listStore().get("lists/" + code, { type: "json" }))) return json({ error: "No existe" }, 404);
    const key = emailKey(email).slice(6);
    const list = fresh(await inv().get(key, { type: "json" }).catch(() => null)).filter(x => x.code !== code);
    list.unshift({ code, from: String(user.name || "").slice(0, 40), at: Date.now() });
    await inv().setJSON(key, list.slice(0, 10));
    // Misma respuesta exista o no esa cuenta (así nadie puede averiguar qué correos están registrados).
    return json({ ok: true });
  }
  const key = emailKey(user.email).slice(6);
  if (b.op === "check") {
    const list = fresh(await inv().get(key, { type: "json" }).catch(() => null));
    return json({ invites: list.map(x => ({ code: x.code, from: x.from })) });
  }
  if (b.op === "clear") {
    const list = fresh(await inv().get(key, { type: "json" }).catch(() => null)).filter(x => x.code !== String(b.code || ""));
    if (list.length) await inv().setJSON(key, list); else await inv().delete(key).catch(() => {});
    return json({ ok: true });
  }
  return json({ error: "Operación inválida" }, 400);
};
export const config = { path: "/api/list-invite" };
