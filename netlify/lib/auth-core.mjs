// Cuentas de Mi Lista: registro con correo y contraseña, guardado en Netlify Blobs (sin servicios externos).
import { getStore } from "@netlify/blobs";
import { createHash, createHmac, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(_scrypt);

export const store = () => getStore({ name: "cuentas", consistency: "strong" });
export const FOUNDERS = () => Math.max(0, parseInt(process.env.FOUNDERS_LIMIT || "5", 10) || 0); // primeras cuentas con Plus gratis
const SESSION_DAYS = 120;

export const normEmail = e => String(e || "").trim().toLowerCase();
export const validEmail = e => e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
export const emailKey = e => "users/" + createHash("sha256").update(normEmail(e)).digest("hex");

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scrypt(String(pw), salt, 64);
  return "s1$" + salt.toString("hex") + "$" + key.toString("hex");
}
export async function checkPassword(pw, stored) {
  const [v, saltHex, keyHex] = String(stored || "").split("$");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const key = await scrypt(String(pw), Buffer.from(saltHex, "hex"), 64);
  const want = Buffer.from(keyHex, "hex");
  return want.length === key.length && timingSafeEqual(key, want);
}

// Clave para firmar las sesiones: se crea sola la primera vez.
export async function secret() {
  const s = store();
  let v = await s.get("config/secret", { type: "json" });
  if (v && v.k) return v.k;
  await s.setJSON("config/secret", { k: randomBytes(32).toString("hex") }, { onlyIfNew: true });
  return (await s.get("config/secret", { type: "json" })).k;
}
const b64u = b => Buffer.from(b).toString("base64url");
export async function sessionFor(user) {
  const body = b64u(JSON.stringify({ uid: user.uid, k: user.key, exp: Date.now() + SESSION_DAYS * 864e5, sv: user.sv || 1 }));
  return body + "." + b64u(createHmac("sha256", await secret()).update(body).digest());
}
export async function readSession(token) {
  if (typeof token !== "string" || !token.includes(".") || token.length > 1000) return null;
  const [body, sig] = token.split(".");
  const want = createHmac("sha256", await secret()).update(body).digest();
  let got; try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  let p; try { p = JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
  if (!p || p.exp < Date.now()) return null;
  const user = await store().get(p.k, { type: "json" });
  if (!user || user.uid !== p.uid || (user.sv || 1) !== p.sv) return null; // sv cambia al cambiar la contraseña: cierra otras sesiones
  return user;
}

// Número de cuenta en orden de registro (1, 2, 3…), sin repetir aunque se registren a la vez.
export async function nextNumber() {
  const s = store();
  for (let i = 0; i < 8; i++) {
    const cur = await s.getWithMetadata("meta/counter", { type: "json" });
    if (!cur) {
      const r = await s.setJSON("meta/counter", { n: 1 }, { onlyIfNew: true });
      if (!r || r.modified !== false) return 1;
      continue;
    }
    const n = (cur.data.n || 0) + 1;
    const r = await s.setJSON("meta/counter", { n }, { onlyIfMatch: cur.etag });
    if (!r || r.modified !== false) return n;
    await new Promise(res => setTimeout(res, 30 + Math.random() * 80));
  }
  throw new Error("ocupado");
}

export function publicProfile(u) {
  return { uid: u.uid, email: u.email, name: u.name, n: u.n, founder: !!u.founder, created: u.created };
}
export async function saveUser(u) { await store().setJSON(u.key, u); }

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
export async function readBody(req) {
  const t = await req.text();
  if (t.length > 5000) return {};
  try { return JSON.parse(t || "{}"); } catch { return {}; }
}

// Freno contra quien intente adivinar contraseñas: 8 intentos fallidos → espera 15 minutos.
export async function tooManyAttempts(key) {
  const a = await store().get("attempts/" + key.slice(6), { type: "json" });
  return !!(a && a.n >= 8 && Date.now() - a.t < 15 * 60 * 1000);
}
export async function failedAttempt(key) {
  const k = "attempts/" + key.slice(6);
  const a = (await store().get(k, { type: "json" })) || { n: 0, t: 0 };
  const fresh = Date.now() - a.t > 15 * 60 * 1000;
  await store().setJSON(k, { n: fresh ? 1 : a.n + 1, t: Date.now() });
}
export async function clearAttempts(key) { await store().delete("attempts/" + key.slice(6)).catch(() => {}); }

export function resetCode() { return String(randomBytes(4).readUInt32BE(0) % 1000000).padStart(6, "0"); }
