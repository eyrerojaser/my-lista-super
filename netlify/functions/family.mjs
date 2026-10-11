import { readSession, saveUser, json, readBody } from "../lib/auth-core.mjs";
import { store as lists, validCode } from "../lib/list-store.mjs";
import { MAX_MEMBERS, ownPlan, coversFamily, familyOf, saveFamily, membersInfo, removeMember, userByUid } from "../lib/family.mjs";
import { notifyAdmins } from "../lib/admin-notify.mjs";

// Plan familiar.
//  join   {auth, code}: unirse a la familia de quien creó esa lista compartida
//  info   {auth}: mi familia (si pago) o de quién soy familia
//  remove {auth, uid}: quien paga quita a alguien
//  leave  {auth}: salir de la familia
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const user = await readSession(b.auth);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  const max = MAX_MEMBERS();
  try {
    if (b.action === "join") {
      const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!validCode(code)) return json({ error: "El código tiene 12 letras y números." }, 400);
      const list = await lists().get("lists/" + code, { type: "json" });
      if (!list) return json({ error: "No encontré esa lista. Revisa el código." }, 404);
      let owner = list.owner ? await userByUid(list.owner) : null;
      if (owner && owner.familyOf) owner = (await userByUid(owner.familyOf)) || owner; // la lista la creó alguien de una familia
      if (!owner) return json({ active: false, reason: "noowner" });
      if (owner.uid === user.uid) return json({ active: true, self: true });
      if (!coversFamily(await ownPlan(owner))) return json({ active: false, reason: "noplan", ownerName: owner.name });
      const fam = await familyOf(owner.uid);
      if (!fam.members.includes(user.uid)) {
        if (fam.members.length >= max) return json({ active: false, reason: "full", ownerName: owner.name, max });
        if (user.familyOf && user.familyOf !== owner.uid) await removeMember(user.familyOf, user.uid);
        fam.members.push(user.uid); await saveFamily(owner.uid, fam);
        await notifyAdmins("👨‍👩‍👧 Nuevo familiar", user.name + " se unió a la familia de " + owner.name + " (" + fam.members.length + " de " + max + ")", "admin-fam-" + user.uid);
      }
      user.familyOf = owner.uid; await saveUser(user);
      return json({ active: true, family: true, ownerName: owner.name });
    }
    if (b.action === "info") {
      const plan = await ownPlan(user);
      const out = { plan: plan.plan, max };
      if (coversFamily(plan)) out.members = await membersInfo(await familyOf(user.uid));
      if (user.familyOf) { const o = await userByUid(user.familyOf); if (o) out.familyOf = { name: o.name, photo: o.photo || "" }; }
      return json(out);
    }
    if (b.action === "remove") {
      await removeMember(user.uid, String(b.uid || ""));
      return json({ ok: true, members: await membersInfo(await familyOf(user.uid)) });
    }
    if (b.action === "leave") {
      if (user.familyOf) await removeMember(user.familyOf, user.uid);
      return json({ ok: true });
    }
    return json({ error: "Acción inválida" }, 400);
  } catch { return json({ error: "No se pudo completar. Intenta de nuevo." }, 502); }
};
export const config = { path: "/api/family" };
