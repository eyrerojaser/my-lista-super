import { json, readBody } from "../lib/plus-core.mjs";
import { readSession, saveUser } from "../lib/auth-core.mjs";
import { ownPlan, coversFamily, familyOf, userByUid } from "../lib/family.mjs";

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
    return json({ active: false, hadPlan: !!plan.hadPlan });
  } catch { return json({ error: "No se pudo revisar la suscripción" }, 502); }
};
export const config = { path: "/api/plus-account" };
