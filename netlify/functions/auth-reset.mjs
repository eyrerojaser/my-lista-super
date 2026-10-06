import { notifyAdmins } from "../lib/admin-notify.mjs";
import { store, normEmail, emailKey, hashPassword, resetCode, json, readBody, sessionFor, publicProfile } from "../lib/auth-core.mjs";

// Olvidé mi contraseña.
//  step "request": genera un código de 6 números válido 30 minutos. Si configuraste RESEND_API_KEY y MAIL_FROM
//                  en Netlify, se envía por correo; si no, lo ves tú en el panel de administración para dárselo.
//  step "confirm": con el código se pone una contraseña nueva.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const email = normEmail(b.email), key = emailKey(email), s = store();
  const user = await s.get(key, { type: "json" });
  if (b.step === "request") {
    const emailOn = !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
    if (user) {
      const code = resetCode();
      user.reset = { code, exp: Date.now() + 30 * 60 * 1000, tries: 0, at: Date.now() };
      await s.setJSON(key, user);
      // Aviso para la dueña con el código, para que se lo pueda dar enseguida.
      await notifyAdmins("🔑 Código de contraseña", user.name + " (" + email + "): " + code + " · vence en 30 min", "admin-reset-" + user.uid);
      if (emailOn) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ from: process.env.MAIL_FROM, to: email, subject: "Tu código para cambiar la contraseña",
            text: "Hola " + user.name + ",\n\nTu código para cambiar la contraseña de Mi Lista es: " + code + "\n\nVence en 30 minutos. Si no lo pediste, ignora este correo." }),
        }).catch(() => {});
      }
    }
    // Misma respuesta exista o no la cuenta (así nadie puede averiguar qué correos están registrados).
    return json({ ok: true, byEmail: emailOn });
  }
  if (b.step === "confirm") {
    const pw = String(b.password || "");
    if (pw.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (!user || !user.reset || user.reset.exp < Date.now() || user.reset.tries >= 5) return json({ error: "El código venció. Pide uno nuevo." }, 400);
    if (String(b.code || "").trim() !== user.reset.code) {
      user.reset.tries++; await s.setJSON(key, user);
      return json({ error: "Código incorrecto" }, 400);
    }
    user.pass = await hashPassword(pw); user.sv = (user.sv || 1) + 1; delete user.reset;
    await s.setJSON(key, user);
    return json({ token: await sessionFor(user), user: publicProfile(user) });
  }
  return json({ error: "Paso inválido" }, 400);
};
export const config = { path: "/api/auth-reset" };
