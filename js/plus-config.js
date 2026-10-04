/* Mi Lista: cuentas y suscripción.
   authRequired: true  → para usar la app hay que crear una cuenta (correo y contraseña).
   Plus (Stripe): mientras enabled sea false, todo es gratis para quien tenga cuenta.
   Cuando tengas tu enlace de pago de Stripe:
     1. pégalo en monthly.link (empieza con https://buy.stripe.com/),
     2. revisa el precio que se muestra,
     3. cambia enabled a true.
   Las primeras cuentas registradas (5, o lo que pongas en FOUNDERS_LIMIT en Netlify) tienen Plus gratis.
   La clave secreta de Stripe va SOLO en Netlify (STRIPE_SECRET_KEY). */
window.PLUS_CONFIG = {
  authRequired: true,
  enabled: false,
  // Qué se paga: "todo" (toda la app) o funciones sueltas: "freezer", "compras", "compartida"
  features: ["todo"],
  monthly: { link: "", price: "$5.99 al mes", label: "Plan mensual" },
  yearly:  { link: "", price: "", label: "Plan anual", note: "" },   // déjalo vacío si solo cobras mensual
  trialDays: 0,          // días gratis de prueba (deben coincidir con tu enlace de Stripe)
  foundersLimit: 10,     // solo para mostrar el texto; el número real lo decide el servidor (FOUNDERS_LIMIT)
  promo: true,           // cartel "¡Gratis para las primeras!" con los lugares que quedan, en la pantalla de registro
  supportEmail: "",
};
