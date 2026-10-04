import { store, json, readBody, FOUNDERS } from "../lib/auth-core.mjs";
import { timingSafeEqual, createHash } from "node:crypto";

// Panel de la dueña: lista de cuentas. Protegido con la variable ADMIN_PASSWORD de Netlify.
const same = (a, b) => { const x = createHash("sha256").update(String(a)).digest(), y = createHash("sha256").update(String(b)).digest(); return timingSafeEqual(x, y); };
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || pass.length < 10) return json({ error: "Falta ADMIN_PASSWORD (mínimo 10 caracteres) en Netlify" }, 503);
  if (!same(b.password || "", pass)) { await new Promise(r => setTimeout(r, 800)); return json({ error: "Contraseña incorrecta" }, 401); }
  const s = store();
  const { blobs } = await s.list({ prefix: "users/" });
  const users = [];
  for (const { key } of blobs) {
    const u = await s.get(key, { type: "json" });
    if (!u) continue;
    users.push({ n: u.n, name: u.name, email: u.email, created: u.created, founder: !!u.founder, paying: !!u.stripeCustomer,
      plusStatus: u.plusStatus || "", reset: u.reset && u.reset.exp > Date.now() ? u.reset.code : "" });
  }
  users.sort((a, b) => (a.n || 0) - (b.n || 0));
  return json({ users, founders: FOUNDERS() });
};
export const config = { path: "/api/admin-users" };
