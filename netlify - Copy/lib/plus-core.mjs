// Mi Lista Plus: lógica compartida de las funciones de suscripción (Stripe).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const API = () => process.env.STRIPE_API_BASE || "https://api.stripe.com";
export const ACTIVE = new Set(["active", "trialing", "past_due"]); // past_due: Stripe sigue reintentando el cobro
export const GRACE_SECONDS = 3 * 24 * 3600;

function form(params, prefix = "", out = []) {
  for (const [k, v] of Object.entries(params || {})) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(x => out.push(`${encodeURIComponent(key + "[]")}=${encodeURIComponent(x)}`));
    else if (typeof v === "object") form(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out.join("&");
}

export async function stripe(path, { method = "GET", params } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { const e = new Error("Falta STRIPE_SECRET_KEY en Netlify"); e.status = 500; throw e; }
  const qs = method === "GET" && params ? "?" + form(params) : "";
  const res = await fetch(API() + path + qs, {
    method,
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: method === "GET" ? undefined : form(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error((data.error && data.error.message) || "stripe " + res.status); e.status = res.status; e.stripe = data.error; throw e; }
  return data;
}

const b64u = buf => Buffer.from(buf).toString("base64url");
export function signToken(secret, payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = b64u(createHmac("sha256", secret).update(body).digest());
  return body + "." + sig;
}
export function verifyToken(secret, token) {
  if (typeof token !== "string" || token.length > 2000 || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const want = createHmac("sha256", secret).update(body).digest();
  let got;
  try { got = Buffer.from(sig, "base64url"); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return null; }
}

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newCode() {
  const b = randomBytes(12);
  return Array.from(b, x => ALPHA[x % ALPHA.length]).join("");
}
export const cleanCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

// Busca la suscripción vigente más reciente del cliente (por si canceló y volvió a suscribirse).
export async function activeSubscription(customer) {
  const list = await stripe("/v1/subscriptions", { params: { customer, status: "all", limit: 10 } });
  const subs = (list.data || []).filter(s => ACTIVE.has(s.status));
  subs.sort((a, b) => (b.current_period_end || 0) - (a.current_period_end || 0));
  return subs[0] || null;
}

export function tokenFor(secret, customer, sub, code) {
  const until = (sub.current_period_end || Math.floor(Date.now() / 1000) + 86400) + GRACE_SECONDS;
  return { token: signToken(secret, { v: 1, cus: customer, sub: sub.id, code, until }), until, status: sub.status, code };
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function readBody(req) {
  const t = await req.text();
  if (t.length > 5000) return {};
  try { return JSON.parse(t || "{}"); } catch { return {}; }
}
