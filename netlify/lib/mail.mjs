/* Envío de correos de NoPencil (por ahora, el código para cambiar la contraseña).
   Funciona con Brevo (variable BREVO_API_KEY) o con Resend (RESEND_API_KEY). Además hace falta
   MAIL_FROM con el remitente, por ejemplo:  NoPencil <hola@nopencil.app>
   Ese correo (o su dominio) tiene que estar verificado en Brevo o en Resend. */
export const mailOn = () => !!((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && process.env.MAIL_FROM);

function parseFrom(v) {
  const m = /^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(v || "");
  return m ? { name: m[1].replace(/^"|"$/g, "") || "NoPencil", email: m[2] } : { name: "NoPencil", email: String(v || "").trim() };
}

export async function sendMail({ to, subject, text, html }) {
  if (!mailOn()) return false;
  const from = parseFrom(process.env.MAIL_FROM);
  try {
    let r;
    if (process.env.BREVO_API_KEY) {
      r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "accept": "application/json", "content-type": "application/json" },
        body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
      });
    } else {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.name + " <" + from.email + ">", to, subject, text, html }),
      });
    }
    if (!r.ok) { console.error("correo no enviado", r.status, (await r.text().catch(() => "")).slice(0, 300)); return false; }
    return true;
  } catch (e) { console.error("correo no enviado", e.message); return false; }
}
