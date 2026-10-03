import { cleanCode, activeSubscription, tokenFor, json, readBody } from "../lib/plus-core.mjs";
import { signingSecret, customerForCode } from "../lib/plus-store.mjs";

// Desbloquear Plus en otro teléfono (o en la app instalada) con el código de recuperación.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const code = cleanCode((await readBody(req)).code);
  if (code.length !== 12) return json({ error: "El código tiene 12 letras y números" }, 400);
  const customer = await customerForCode(code);
  if (!customer) return json({ error: "No encontré ese código" }, 404);
  try {
    const sub = await activeSubscription(customer);
    if (!sub) return json({ active: false, error: "La suscripción de ese código ya no está activa" }, 402);
    return json({ active: true, ...tokenFor(await signingSecret(), customer, sub, code) });
  } catch { return json({ error: "No se pudo revisar la suscripción" }, 502); }
};
export const config = { path: "/api/plus-restore" };
