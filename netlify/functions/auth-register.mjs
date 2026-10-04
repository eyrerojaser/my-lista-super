import { store, normEmail, validEmail, emailKey, hashPassword, nextNumber, FOUNDERS, sessionFor, publicProfile, json, readBody } from "../lib/auth-core.mjs";
import { randomBytes } from "node:crypto";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const email = normEmail(b.email), name = String(b.name || "").trim().slice(0, 60), pw = String(b.password || "");
  if (!name) return json({ error: "Escribe tu nombre" }, 400);
  if (!validEmail(email)) return json({ error: "Revisa tu correo" }, 400);
  if (pw.length < 8 || pw.length > 200) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  const key = emailKey(email), s = store();
  if (await s.get(key, { type: "json" })) return json({ error: "Ya existe una cuenta con ese correo. Inicia sesión." }, 409);
  const user = { key, uid: randomBytes(12).toString("hex"), email, name, pass: await hashPassword(pw), created: Date.now(), sv: 1 };
  const r = await s.setJSON(key, user, { onlyIfNew: true });
  if (r && r.modified === false) return json({ error: "Ya existe una cuenta con ese correo. Inicia sesión." }, 409);
  user.n = await nextNumber();
  user.founder = user.n <= FOUNDERS();     // las primeras cuentas tienen Plus gratis
  await s.setJSON(key, user);
  await s.setJSON("ids/" + user.uid, { key });
  return json({ token: await sessionFor(user), user: publicProfile(user) });
};
export const config = { path: "/api/auth-register" };
