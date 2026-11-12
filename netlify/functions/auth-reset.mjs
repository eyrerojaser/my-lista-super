import { notifyAdmins } from "../lib/admin-notify.mjs";
import { mailOn, sendMail } from "../lib/mail.mjs";
import { store, normEmail, emailKey, hashPassword, resetCode, json, readBody, sessionFor, publicProfile } from "../lib/auth-core.mjs";

// Olvidé mi contraseña.
//  step "request": genera un código de 6 números válido 30 minutos. Si configuraste BREVO_API_KEY (o RESEND_API_KEY)
//                  y MAIL_FROM en Netlify, se envía por correo; si no, lo ves tú en el panel de administración para dárselo.
//  step "confirm": con el código se pone una contraseña nueva.
export default async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const b = await readBody(req);
  const email = normEmail(b.email), key = emailKey(email), s = store();
  const user = await s.get(key, { type: "json" });
  if (b.step === "request") {
    const emailOn = mailOn();
    if (user) {
      const code = resetCode();
      user.reset = { code, exp: Date.now() + 30 * 60 * 1000, tries: 0, at: Date.now() };
      await s.setJSON(key, user);
      // Aviso para la dueña con el código, para que se lo pueda dar enseguida.
      await notifyAdmins("🔑 Código de contraseña", user.name + " (" + email + "): " + code + " · vence en 30 min", "admin-reset-" + user.uid);
      if (emailOn) {
        const first = String(user.name || "").split(/\s+/)[0].replace(/[<>&"]/g, "");
        const box = 'style="font-size:32px;font-weight:800;letter-spacing:6px;background:#FFF0DD;color:#2A1636;padding:14px 20px;border-radius:12px;display:inline-block"';
        await sendMail({
          to: email,
          subject: "NoPencil: " + code + " es tu código · your code",
          text: "Hola " + first + ",\n\nTu código para cambiar la contraseña de NoPencil es: " + code + "\nVence en 30 minutos. Si no lo pediste, ignora este correo.\n\n—\n\nHi " + first + ",\n\nYour NoPencil password code is: " + code + "\nIt expires in 30 minutes. If you didn't ask for it, ignore this email.",
          html: '<div style="font-family:Arial,Helvetica,sans-serif;color:#2A1636;max-width:480px;margin:auto;padding:20px">' +
            '<p style="font-size:22px;font-weight:800;margin:0 0 16px">No<span style="color:#FF8A1F">Pencil</span></p>' +
            "<p>Hola " + first + ",</p><p>Tu código para cambiar la contraseña es:</p><p " + box + ">" + code + "</p>" +
            '<p style="color:#6B5A73">Vence en 30 minutos. Si no lo pediste, ignora este correo.</p><hr style="border:0;border-top:1px solid #eee;margin:20px 0">' +
            "<p>Hi " + first + ", your password code is <b>" + code + '</b>.</p><p style="color:#6B5A73">It expires in 30 minutes. If you didn\'t ask for it, ignore this email.</p></div>',
        });
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
