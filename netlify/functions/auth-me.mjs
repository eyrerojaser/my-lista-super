import { readSession, publicProfile, json, readBody } from "../lib/auth-core.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const user = await readSession((await readBody(req)).token);
  if (!user) return json({ error: "Sesión vencida" }, 401);
  return json({ user: publicProfile(user) });
};
export const config = { path: "/api/auth-me" };
