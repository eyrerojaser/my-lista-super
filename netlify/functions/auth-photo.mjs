import { readSession, saveUser, publicProfile, json } from "../lib/auth-core.mjs";

// Foto de perfil: se guarda en la cuenta (pequeña, ya recortada y reducida por la app).
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const text = await req.text();
  if (text.length > 220000) return json({ error: "La foto es demasiado grande" }, 413);
  let b; try { b = JSON.parse(text || "{}"); } catch { return json({ error: "Datos inválidos" }, 400); }
  const user = await readSession(b.token);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  if (b.photo === null || b.photo === "") delete user.photo;
  else if (typeof b.photo === "string" && b.photo.length < 200000 && PHOTO_RE.test(b.photo)) user.photo = b.photo;
  else return json({ error: "Foto inválida" }, 400);
  await saveUser(user);
  return json({ user: publicProfile(user) });
};
export const config = { path: "/api/auth-photo" };
