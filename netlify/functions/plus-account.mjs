import { json, readBody } from "../lib/plus-core.mjs";
import { readSession, saveUser } from "../lib/auth-core.mjs";
import { ownPlan, coversFamily, familyOf, userByUid } from "../lib/family.mjs";
import { trialDays } from "../lib/trial.mjs";

// ¿Esta cuenta tiene Plus? Fundadoras: siempre. Si paga: su plan. Si es de una familia: el plan de quien paga.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const user = await readSession((await readBody(req)).auth);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  try {
    const plan = await ownPlan(user);
    if (plan.active) return json({ active: true, founder: plan.plan === "founder", plan: plan.plan, status: plan.status, until: plan.until });
    if (user.familyOf) {
      const owner = await userByUid(user.familyOf);
      const fam = owner ? await familyOf(owner.uid) : null;
      if (owner && fam && fam.members.includes(user.uid)) {
        const op = await ownPlan(owner);
        if (coversFamily(op)) return json({ active: true, plan: "member", status: "family", ownerName: owner.name, until: op.until });
      } else { delete user.familyOf; await saveUser(user); }
    }
    // Prueba gratis sin tarjeta: FREE_TRIAL_DAYS días desde que se creó la cuenta (14 por defecto).
    const days = trialDays();
    if (days > 0 && user.created && !plan.hadPlan) {
      const end = user.created + days * 864e5;
      if (Date.now() < end) return json({ active: true, plan: "trial", status: "trial", until: Math.floor(end / 1000), trialLeft: Math.ceil((end - Date.now()) / 864e5) });
      return json({ active: false, trialEnded: true, trialDays: days });
    }
    return json({ active: false, hadPlan: !!plan.hadPlan });
  } catch { return json({ error: "No se pudo revisar la suscripción" }, 502); }
};
export const config = { path: "/api/plus-account" };
