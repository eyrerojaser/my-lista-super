import { stripe, tokenFor, json, ACTIVE } from "../lib/plus-core.mjs";
import { signingSecret, codeForCustomer } from "../lib/plus-store.mjs";
import { store as accounts, saveUser } from "../lib/auth-core.mjs";

// Después de pagar, Stripe regresa a la app con ?plus_session=cs_...; aquí se confirma que el pago es real.
export default async (req) => {
  const id = new URL(req.url).searchParams.get("session") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return json({ error: "Sesión inválida" }, 400);
  try {
    const session = await stripe("/v1/checkout/sessions/" + id, { params: { expand: ["subscription"] } });
    if (session.mode !== "subscription" || session.status !== "complete" || !session.subscription || !session.customer)
      return json({ active: false, error: "El pago no está completo" }, 402);
    const sub = session.subscription;
    if (!ACTIVE.has(sub.status)) return json({ active: false, error: "La suscripción no está activa" }, 402);
    const customer = typeof session.customer === "string" ? session.customer : session.customer.id;
    const code = await codeForCustomer(customer);
    // Si pagó desde su cuenta, el pago queda unido a esa cuenta (así se desbloquea en cualquier teléfono al iniciar sesión).
    if (session.client_reference_id && /^[a-f0-9]{24}$/.test(session.client_reference_id)) {
      try {
        const link = await accounts().get("ids/" + session.client_reference_id, { type: "json" });
        const user = link && await accounts().get(link.key, { type: "json" });
        if (user) { user.stripeCustomer = customer; user.plusStatus = sub.status; await saveUser(user); }
      } catch {}
    }
    return json({ active: true, ...tokenFor(await signingSecret(), customer, sub, code) });
  } catch (e) {
    return json({ error: e.status === 404 ? "No se encontró el pago" : "No se pudo confirmar el pago" }, e.status === 404 ? 404 : 502);
  }
};
export const config = { path: "/api/plus-verify" };
