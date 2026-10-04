import { activeSubscription, json, readBody } from "../lib/plus-core.mjs";
import { readSession, saveUser } from "../lib/auth-core.mjs";

// ¿Esta cuenta tiene Plus? Fundadoras: siempre. Las demás: si su suscripción de Stripe está activa.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const user = await readSession((await readBody(req)).auth);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  if (user.founder) return json({ active: true, founder: true, status: "founder" });
  if (!user.stripeCustomer) return json({ active: false });
  try {
    const sub = await activeSubscription(user.stripeCustomer);
    const status = sub ? sub.status : "inactive";
    if (user.plusStatus !== status) { user.plusStatus = status; await saveUser(user); }
    if (!sub) return json({ active: false, hadPlan: true });
    return json({ active: true, status: sub.status, until: (sub.current_period_end || 0) + 3 * 86400 });
  } catch { return json({ error: "No se pudo revisar la suscripción" }, 502); }
};
export const config = { path: "/api/plus-account" };
