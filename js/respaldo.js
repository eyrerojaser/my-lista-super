/* Copia en la cuenta: guarda la lista, Mis Compras, Freezer/Refri/Despensa, los productos
   agregados a las categorías y las fotos de los recibos en la cuenta de la persona.
   Al entrar con el mismo correo en otro teléfono (o al reinstalar la app) todo vuelve.
   Funciona solo: cada cambio se sube a los pocos segundos, y al abrir la app se trae lo más nuevo.
   Se carga antes que las demás partes de la app para enterarse de cada cambio. */
(function () {
  const KEYS = ["grocery-list-v1", "purchases-v1", "freezer-items-v1", "custom-products-v1", "cat-overrides-v1"];
  const META = "cloud-meta-v1";
  const ACC = () => window.MiCuenta;
  const ls = window.localStorage;
  const rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;

  let meta = {};
  try { meta = JSON.parse(ls.getItem(META)) || {}; } catch {}
  meta.ts = meta.ts || {};          // clave → cuándo cambió en este teléfono
  meta.photos = meta.photos || [];  // fotos que ya están en la cuenta
  const saveMeta = () => { try { rawSet.call(ls, META, JSON.stringify(meta)); } catch {} };

  let applying = false, dirty = false, timer = null, busy = false, lastPull = 0, lastError = "";
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(); } catch {} });

  // Se entera de cada cambio que la app guarda en el teléfono.
  function touched(k) {
    if (applying || !KEYS.includes(k)) return;
    meta.ts[k] = Date.now(); saveMeta();
    dirty = true; schedule();
  }
  Storage.prototype.setItem = function (k, v) { const r = rawSet.call(this, k, v); if (this === ls) touched(k); return r; };
  Storage.prototype.removeItem = function (k) { const r = rawRemove.call(this, k); if (this === ls) touched(k); return r; };

  const token = () => ACC() && ACC().token();
  const uid = () => { const u = ACC() && ACC().user(); return u && u.uid; };
  const active = () => !!(token() && uid());

  function schedule(ms) { clearTimeout(timer); timer = setTimeout(() => sync(false), ms == null ? 2500 : ms); }

  async function api(body) {
    const r = await fetch("/api/user-data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ token: token() }, body)) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || "error " + r.status); e.status = r.status; throw e; }
    return d;
  }

  const isEmpty = v => v == null || v === "" || v === "[]" || v === "{}" || v === "null";
  // Junta lo de este teléfono con lo de la cuenta (solo la primera vez que se conectan).
  function merge(local, remote) {
    let a, b;
    try { a = JSON.parse(local); b = JSON.parse(remote); } catch { return remote; }
    if (Array.isArray(a) && Array.isArray(b)) {
      const seen = new Set(b.map(x => x && x.id).filter(Boolean));
      return JSON.stringify(b.concat(a.filter(x => !x || !x.id || !seen.has(x.id))));
    }
    if (a && b && typeof a === "object" && typeof b === "object") return JSON.stringify(Object.assign({}, a, b));
    return remote;
  }

  function payload() {
    const data = {};
    for (const k of KEYS) { const v = ls.getItem(k); if (v != null) data[k] = { v, ts: meta.ts[k] || Date.now() }; }
    return data;
  }
  function photoRecords() {
    try { return (JSON.parse(ls.getItem("purchases-v1")) || []).filter(r => r && r.photo && r.id); } catch { return []; }
  }

  // Trae lo de la cuenta; si hay algo más nuevo, lo pone en el teléfono.
  // Devuelve true si cambió algo (hay que recargar la pantalla).
  function applyRemote(remote) {
    let changed = false;
    applying = true;
    try {
      for (const k of KEYS) {
        const s = remote[k], lv = ls.getItem(k), lt = meta.ts[k] || 0;
        if (!s) { if (!isEmpty(lv)) { meta.ts[k] = meta.ts[k] || Date.now(); dirty = true; } continue; }
        if (!lt) {
          // Primera vez en este teléfono: si aquí no hay nada, se usa lo de la cuenta; si hay, se juntan.
          if (isEmpty(lv)) { if (lv !== s.v) { rawSet.call(ls, k, s.v); changed = true; } meta.ts[k] = s.ts; }
          else { const m = merge(lv, s.v); if (m !== lv) { rawSet.call(ls, k, m); changed = true; } meta.ts[k] = Date.now(); if (m !== s.v) dirty = true; }
        } else if (s.ts > lt) {
          if (lv !== s.v) { rawSet.call(ls, k, s.v); changed = true; }
          meta.ts[k] = s.ts;
        } else if (s.ts < lt && lv !== s.v) dirty = true;
      }
    } finally { applying = false; saveMeta(); }
    return changed;
  }

  /* ---------- fotos de los recibos (Mis Compras las guarda en IndexedDB) ---------- */
  let dbP = null;
  function db() {
    if (!dbP) dbP = new Promise((res, rej) => {
      const r = indexedDB.open("mis-compras", 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains("photos")) r.result.createObjectStore("photos"); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbP = null; rej(r.error); };
    });
    return dbP;
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction("photos", mode), req = fn(tx.objectStore("photos"));
      tx.oncomplete = () => res(req && req.result); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
    });
  }
  async function syncPhotos(serverIds) {
    const onServer = new Set(serverIds || []);
    for (const r of photoRecords()) {
      if (!active()) return;
      const local = await idb("readonly", st => st.get(r.id)).catch(() => null);
      if (local && !onServer.has(r.id)) {
        // Subir la foto que solo está en este teléfono.
        const res = await fetch("/api/user-photo?id=" + encodeURIComponent(r.id), { method: "PUT", headers: { "Authorization": "Bearer " + token(), "Content-Type": local.type && /^image\/(jpeg|png|webp)$/.test(local.type) ? local.type : "image/jpeg" }, body: local });
        if (res.ok) onServer.add(r.id);
      } else if (!local && onServer.has(r.id)) {
        // Bajar la foto que está en la cuenta pero no en este teléfono.
        const res = await fetch("/api/user-photo?id=" + encodeURIComponent(r.id), { headers: { "Authorization": "Bearer " + token() } });
        if (res.ok) { const blob = await res.blob(); await idb("readwrite", st => st.put(blob, r.id)).catch(() => {}); }
      }
    }
    meta.photos = [...onServer]; saveMeta();
  }

  /* ---------- sincronizar ---------- */
  async function sync(pull) {
    if (!active() || !navigator.onLine) return false;
    if (busy) { schedule(1500); return false; }
    busy = true;
    let reload = false;
    try {
      // Si en este teléfono entra otra cuenta, se borran los datos de la anterior.
      if (meta.owner && meta.owner !== uid()) {
        applying = true;
        try { KEYS.forEach(k => rawRemove.call(ls, k)); } finally { applying = false; }
        await idb("readwrite", st => st.clear()).catch(() => {});
        meta = { ts: {}, photos: [], owner: uid() }; saveMeta();
        reload = true;
      }
      if (!meta.owner) { meta.owner = uid(); saveMeta(); }
      if (pull || reload) {
        const got = await api({ op: "get" });
        lastPull = Date.now();
        if (applyRemote(got.data || {})) reload = true;
        meta.photos = got.photos || [];
      }
      if (dirty) {
        dirty = false;
        const put = await api({ op: "put", data: payload() });
        // Otro teléfono pudo guardar algo más nuevo mientras tanto.
        if (applyRemote(put.data || {})) reload = true;
        meta.photos = put.photos || meta.photos;
      }
      meta.last = Date.now(); lastError = ""; saveMeta();
      if (reload) {
        try { sessionStorage.setItem("cloud-restored", "1"); } catch {}
        location.reload();
        return true;
      }
      await syncPhotos(meta.photos);
    } catch (e) {
      lastError = e.message || "error";
      if (e.status === 401) return false; // la sesión venció: la pantalla de la cuenta se encarga
      dirty = dirty || Object.keys(meta.ts).length > 0;
      schedule(30000);
    } finally { busy = false; emit(); }
    return reload;
  }

  // La última copia antes de cerrar sesión (se usa el token que había).
  let lastToken = token();
  if (ACC()) ACC().onChange(a => {
    if (a && a.token) {
      const first = !lastToken; lastToken = a.token;
      if (first) sync(true); // acaba de entrar: traer sus datos
    } else if (lastToken && dirty) {
      const t = lastToken; lastToken = null;
      try { fetch("/api/user-data", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: t, op: "put", data: payload() }) }); } catch {}
    } else lastToken = null;
  });

  // Al abrir la app y al volver a ella, se trae lo más nuevo.
  if (active()) sync(true);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (dirty) sync(false); }
    else if (Date.now() - lastPull > 60000) sync(true);
  });
  window.addEventListener("online", () => sync(true));

  // Aviso después de recuperar los datos.
  try {
    if (sessionStorage.getItem("cloud-restored")) {
      sessionStorage.removeItem("cloud-restored");
      window.addEventListener("load", () => setTimeout(() => { if (window.MiLista) MiLista.toast("☁️ Tus datos se cargaron desde tu cuenta"); }, 600));
    }
  } catch {}

  window.Respaldo = {
    active,
    last: () => meta.last || 0,
    pending: () => dirty,
    error: () => lastError,
    now: () => { dirty = true; return sync(true); },
    onChange: f => listeners.push(f),
  };
})();
