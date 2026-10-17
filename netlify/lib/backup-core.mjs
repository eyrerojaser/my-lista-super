// Copia en la cuenta: la lista, Mis Compras, Freezer/Refri/Despensa y las fotos de los recibos.
// Así, al entrar con el mismo correo en otro teléfono (o al reinstalar la app), todo vuelve.
import { getStore } from "@netlify/blobs";

export const store = () => getStore({ name: "respaldos", consistency: "strong" });
// Solo estas partes de la app se guardan en la cuenta.
export const KEYS = ["grocery-list-v1", "purchases-v1", "freezer-items-v1", "custom-products-v1", "cat-overrides-v1"];
export const MAX_DATA = 1_500_000;   // datos (texto) por cuenta
export const MAX_PHOTO = 2_500_000;  // cada foto de recibo
export const MAX_PHOTOS = 400;       // fotos por cuenta
export const PHOTO_ID = /^c[a-z0-9]{4,30}$/;

export const dataKey = uid => "u/" + uid;
export const photoPrefix = uid => "p/" + uid + "/";

export async function photoIds(uid) {
  const out = [];
  const { blobs } = await store().list({ prefix: photoPrefix(uid) });
  for (const b of blobs) out.push(b.key.slice(photoPrefix(uid).length));
  return out;
}
