import { getStore } from "@netlify/blobs";
import { randomBytes } from "node:crypto";
import { newCode, stripe } from "./plus-core.mjs";

export const store = () => getStore("mi-lista-plus");

// Clave para firmar los desbloqueos: se crea sola la primera vez y se guarda en el sitio.
export async function signingSecret() {
  const s = store();
  let v = await s.get("config/signing", { type: "json" });
  if (v && v.secret) return v.secret;
  await s.setJSON("config/signing", { secret: randomBytes(32).toString("hex") }, { onlyIfNew: true });
  v = await s.get("config/signing", { type: "json" });
  return v.secret;
}

// Código de recuperación del cliente (el mismo siempre). Se guarda también en Stripe para que la dueña lo vea.
export async function codeForCustomer(customer) {
  const s = store();
  const known = await s.get("customers/" + customer, { type: "json" });
  if (known && known.code) return known.code;
  const code = newCode();
  await s.setJSON("codes/" + code, { customer, created: Date.now() });
  await s.setJSON("customers/" + customer, { code, created: Date.now() });
  try { await stripe("/v1/customers/" + customer, { method: "POST", params: { metadata: { codigo_mi_lista: code } } }); } catch {}
  return code;
}
export async function customerForCode(code) {
  const v = await store().get("codes/" + code, { type: "json" });
  return v ? v.customer : null;
}
