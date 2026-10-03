import { vapidKeys } from "../lib/store.mjs";

export default async () => {
  const { publicKey } = await vapidKeys();
  return Response.json({ publicKey }, { headers: { "Cache-Control": "no-store" } });
};

export const config = { path: "/api/push-key" };
