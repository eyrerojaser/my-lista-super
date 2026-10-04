import { stripe, verifyToken, json, readBody } from "../lib/plus-core.mjs";
import { signingSecret } from "../lib/plus-store.mjs";
import { readSession } from "../lib/auth-core.mjs";

// Abre el portal de Stripe para cancelar, cambiar de plan o de tarjeta.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const { token, auth } = await readBody(req);
  let customer = null;
  if (auth) { const user = await readSession(auth); customer = user && user.stripeCustomer; }
  else { const t = verifyToken(await signingSecret(), token); customer = t && t.cus; }
  if (!customer) return json({ error: "No encontré tu suscripción" }, 401);
  const origin = new URL(req.url).origin;
  try {
    const s = await stripe("/v1/billing_portal/sessions", { method: "POST", params: { customer, return_url: origin + "/?plus=1" } });
    return json({ url: s.url });
  } catch (e) { return json({ error: "No se pudo abrir el portal. Revisa que esté activado en Stripe." }, 502); }
};
export const config = { path: "/api/plus-portal" };
