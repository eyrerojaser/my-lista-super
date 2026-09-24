/* Service worker: permite abrir la app sin internet.
   Cambia VERSION cada vez que subas cambios para que los teléfonos se actualicen. */
const VERSION = "v1.3.0";
const SHELL = "shell-" + VERSION;
const IMAGES = "product-images";
const FILES = [
  "./",
  "index.html",
  "css/styles.css",
  "js/app.js",
  "js/products.js",
  "js/scanner.js",
  "js/freezer.js",
  "js/freezer-date.js",
  "vendor/zxing.min.js",
  "fonts/bricolage-grotesque.woff2",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "icons/favicon-32.png",
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("shell-") && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Páginas: primero la red (para recibir actualizaciones), si no hay, la copia guardada.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone(); caches.open(SHELL).then(c => c.put("index.html", copy));
        return res;
      }).catch(() => caches.match("index.html"))
    );
    return;
  }

  // Lector de fechas (archivos grandes): se descargan una vez y se guardan.
  if (url.origin === self.location.origin && url.pathname.includes("/vendor/tesseract/")) {
    event.respondWith(
      caches.open("ocr-v1").then(async c => {
        const cached = await c.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Las funciones del servidor (avisos) nunca se guardan.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) return;

  // Archivos de la app: copia guardada y se actualiza en segundo plano.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then(cached => {
        const net = fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  // Fotos de productos: se guardan para verlas sin internet.
  if (/images\.open(food|products|beauty)facts\.org$/.test(url.hostname)) {
    event.respondWith(
      caches.open(IMAGES).then(async c => {
        const cached = await c.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req, { mode: "no-cors" });
          c.put(req, res.clone());
          trim(c, 300);
          return res;
        } catch { return Response.error(); }
      })
    );
  }
  // Las consultas a la base de datos de productos van directo a la red.
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

/* ---------- Freezer Scan: avisos ---------- */
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || "❄️ Freezer: úsalo pronto";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "Tienes productos del freezer que vencen pronto.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: data.tag || "freezer",
    data: { url: data.url || "./?freezer=1" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./?freezer=1", self.location.href).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if ("focus" in c) { await c.navigate(target).catch(() => {}); return c.focus(); }
    }
    return self.clients.openWindow(target);
  })());
});
