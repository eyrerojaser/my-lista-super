import { stripe, verifyToken, json, readBody } from "../lib/plus-core.mjs";
import { signingSecret } from "../lib/plus-store.mjs";

// Abre el portal de Stripe para cancelar, cambiar de plan o de tarjeta.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const { token } = await readBody(req);
  const t = verifyToken(await signingSecret(), token);
  if (!t || !t.cus) return json({ error: "Desbloqueo inválido" }, 401);
  const origin = new URL(req.url).origin;
  try {
    const s = await stripe("/v1/billing_portal/sessions", { method: "POST", params: { customer: t.cus, return_url: origin + "/?plus=1" } });
    return json({ url: s.url });
  } catch (e) { return json({ error: "No se pudo abrir el portal. Revisa que esté activado en Stripe." }, 502); }
};
export const config = { path: "/api/plus-portal" };
