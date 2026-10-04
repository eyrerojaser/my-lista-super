import { store, normEmail, emailKey, checkPassword, sessionFor, publicProfile, json, readBody, tooManyAttempts, failedAttempt, clearAttempts } from "../lib/auth-core.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const key = emailKey(normEmail(b.email));
  if (await tooManyAttempts(key)) return json({ error: "Demasiados intentos. Espera 15 minutos." }, 429);
  const user = await store().get(key, { type: "json" });
  if (!user || !(await checkPassword(b.password, user.pass))) {
    await failedAttempt(key);
    return json({ error: "Correo o contraseña incorrectos" }, 401);
  }
  await clearAttempts(key);
  return json({ token: await sessionFor(user), user: publicProfile(user) });
};
export const config = { path: "/api/auth-login" };
