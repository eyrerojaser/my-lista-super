// Plan familiar: quien paga el plan familiar (o es fundadora) cubre a su familia.
import { store, saveUser, publicProfile } from "./auth-core.mjs";
import { activeSubscription } from "./plus-core.mjs";

export const MAX_MEMBERS = () => Math.max(1, parseInt(process.env.FAMILY_MEMBERS || "5", 10) || 5); // personas además de quien paga

// ¿Esta suscripción es del plan familiar? (en Stripe, el precio familiar lleva metadata plan = family)
export function isFamilySub(sub) {
  const ids = String(process.env.STRIPE_FAMILY_PRICES || "").split(",").map(s => s.trim()).filter(Boolean);
  return !!(sub && sub.items && (sub.items.data || []).some(it => {
    const p = it.price || {};
    return (p.metadata && /^(family|familiar)$/i.test(p.metadata.plan || "")) || /^(family|familiar)$/i.test(p.lookup_key || "") || ids.includes(p.id);
  }));
}

export async function userByUid(uid) {
  if (!uid || !/^[a-f0-9]{24}$/.test(uid)) return null;
  const link = await store().get("ids/" + uid, { type: "json" });
  return link ? await store().get(link.key, { type: "json" }) : null;
}

// Estado del plan de una cuenta: { active, plan: "founder" | "family" | "individual" | "", status, until }
export async function ownPlan(user) {
  if (!user) return { active: false, plan: "" };
  if (user.founder) return { active: true, plan: "founder", status: "founder" };
  if (!user.stripeCustomer) return { active: false, plan: "" };
  const sub = await activeSubscription(user.stripeCustomer);
  const status = sub ? sub.status : "inactive";
  if (user.plusStatus !== status) { user.plusStatus = status; await saveUser(user); }
  if (!sub) return { active: false, plan: "", hadPlan: true };
  return { active: true, plan: isFamilySub(sub) ? "family" : "individual", status: sub.status, until: (sub.current_period_end || 0) + 3 * 86400 };
}
export const coversFamily = plan => plan.active && (plan.plan === "family" || plan.plan === "founder");

export async function familyOf(ownerUid) {
  return (await store().get("family/" + ownerUid, { type: "json" })) || { members: [] };
}
export async function saveFamily(ownerUid, fam) { await store().setJSON("family/" + ownerUid, fam); }

export async function membersInfo(fam) {
  const out = [];
  for (const uid of fam.members || []) {
    const u = await userByUid(uid);
    if (u) { const p = publicProfile(u); out.push({ uid: p.uid, name: p.name, email: p.email, photo: p.photo }); }
  }
  return out;
}

export async function removeMember(ownerUid, memberUid) {
  const fam = await familyOf(ownerUid);
  fam.members = (fam.members || []).filter(u => u !== memberUid);
  await saveFamily(ownerUid, fam);
  const m = await userByUid(memberUid);
  if (m && m.familyOf === ownerUid) { delete m.familyOf; await saveUser(m); }
}
