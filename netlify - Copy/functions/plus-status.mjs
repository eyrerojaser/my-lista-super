import { verifyToken, activeSubscription, tokenFor, json, readBody } from "../lib/plus-core.mjs";
import { signingSecret } from "../lib/plus-store.mjs";

// La app pregunta de vez en cuando si la suscripción sigue activa.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const { token } = await readBody(req);
  const secret = await signingSecret();
  const t = verifyToken(secret, token);
  if (!t || !t.cus) return json({ active: false, error: "Desbloqueo inválido" }, 401);
  try {
    const sub = await activeSubscription(t.cus);
    if (!sub) return json({ active: false });
    return json({ active: true, ...tokenFor(secret, t.cus, sub, t.code) });
  } catch { return json({ error: "No se pudo revisar la suscripción" }, 502); }
};
export const config = { path: "/api/plus-status" };
