import { store, FOUNDERS, json } from "../lib/auth-core.mjs";
import { trialDays, foundersOpen } from "../lib/trial.mjs";

// Cuántos lugares gratis quedan (para el cartel de la promoción en la pantalla de registro).
export default async () => {
  const c = await store().get("meta/counter", { type: "json" });
  const used = (c && c.n) || 0, limit = FOUNDERS();
  return json({ limit, used, left: foundersOpen() ? Math.max(0, limit - used) : 0, trialDays: trialDays() });
};
export const config = { path: "/api/promo" };
