/* Mi Lista Plus (suscripción con Stripe).
   Mientras enabled sea false, todo sigue gratis y no se muestra nada de Plus.
   Cuando tengas tus enlaces de pago de Stripe:
     1. pega cada enlace en link (empiezan con https://buy.stripe.com/),
     2. escribe el precio como quieres que se vea (price),
     3. cambia enabled a true.
   Estos datos no son secretos. La clave secreta de Stripe va SOLO en Netlify (STRIPE_SECRET_KEY). */
window.PLUS_CONFIG = {
  enabled: false,
  // Qué funciones son de Plus: "freezer" (Freezer Scan), "compras" (Mis Compras), "compartida" (Lista compartida)
  features: ["freezer", "compras"],
  monthly: { link: "", price: "", label: "Plan mensual" },   // ej. price: "$2.99 al mes"
  yearly:  { link: "", price: "", label: "Plan anual", note: "" }, // ej. price: "$19.99 al año", note: "Ahorra 44%"
  trialDays: 7,          // 0 si no das prueba gratis (debe coincidir con tus enlaces de Stripe)
  supportEmail: "",      // correo para que tus clientas te escriban
};
