// Lógica compartida de los avisos de Freezer Scan (se usa en las funciones de Netlify).
import { createHash } from "node:crypto";

export const WARN_DAYS = 3;
export const SEND_HOUR = 9; // hora local a partir de la cual se envían los avisos

export function subId(endpoint) {
  return createHash("sha256").update(String(endpoint)).digest("hex").slice(0, 40);
}

export function validSubscription(s) {
  return !!(s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
    s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string");
}

export function validTz(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

export function sanitizeItems(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 300).map(i => ({
    id: String(i && i.id || "").slice(0, 40),
    name: String(i && i.name || "").replace(/\s+/g, " ").trim().slice(0, 80),
    date: String(i && i.date || ""),
  })).filter(i => i.id && i.name && /^\d{4}-\d{2}-\d{2}$/.test(i.date));
}

// Fecha y hora local de la persona según su zona horaria.
export function localNow(tz, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: parseInt(parts.hour, 10) };
}

const dayNum = iso => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; };
export const daysBetween = (fromIso, toIso) => Math.round(dayNum(toIso) - dayNum(fromIso));

// Productos que deben avisarse ahora (una sola vez por producto y fecha).
export function dueItems(record, now = new Date()) {
  const { date, hour } = localNow(record.tz || "America/Chicago", now);
  if (hour < SEND_HOUR) return [];
  const sent = record.sent || {};
  return (record.items || [])
    .map(i => ({ ...i, left: daysBetween(date, i.date) }))
    .filter(i => i.left <= WARN_DAYS && !sent[i.id + "|" + i.date]);
}

function daysText(n) {
  if (n > 1) return `en ${n} días`;
  if (n === 1) return "mañana";
  if (n === 0) return "hoy";
  return "ya venció";
}

export function buildMessage(due) {
  due = due.slice().sort((a, b) => a.left - b.left);
  const title = due.length === 1 ? `❄️ Usa pronto: ${due[0].name}` : `❄️ ${due.length} productos del freezer por usar`;
  const lines = due.slice(0, 5).map(i => `${i.name} — vence ${daysText(i.left)}`);
  if (due.length > 5) lines.push(`y ${due.length - 5} más`);
  return { title, body: lines.join("\n"), tag: "freezer", url: "./?freezer=1" };
}
