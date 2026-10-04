/* Lista compartida (Netlify: se guarda en tu sitio y cada teléfono revisa cambios cada pocos segundos).
   Varias personas abren la misma lista; lo que una agrega, quita o marca aparece en las demás en unos segundos.
   La lista sigue guardándose también en el teléfono, así que funciona sin señal y se sincroniza al volver. */
(function () {
  const KEY = "share-v1";
  const $ = id => document.getElementById(id);
  const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin letras que se confunden (O/0, I/1)
  const FIELDS = ["id", "name", "detail", "emoji", "img", "code", "qty", "done", "t", "c", "cat", "pending"];

  let info = null;          // { code } de la lista a la que pertenece este teléfono
  let backend = null;       // conexión con el servidor de la app (Netlify)
  let unsub = null;
  let lastRemote = {};      // id → JSON del producto tal como está en la nube
  let applying = false;     // true mientras se aplica un cambio que llegó de otro teléfono
  let status = "off";       // off | connecting | live | offline | error | gone
  let pushTimer = null;

  try { info = JSON.parse(localStorage.getItem(KEY)); } catch {}
  const saveInfo = () => { try { info ? localStorage.setItem(KEY, JSON.stringify(info)) : localStorage.removeItem(KEY); } catch {} };
  const configured = () => location.protocol === "https:" || !!window.__SHARE_MOCK || location.hostname === "localhost";

  function newCode() {
    const b = new Uint8Array(12); crypto.getRandomValues(b);
    return Array.from(b, x => ALPHA[x % ALPHA.length]).join("");
  }
  const pretty = c => c.replace(/(.{4})(?=.)/g, "$1-");
  const cleanCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  function canon(i) {
    const o = {};
    FIELDS.forEach(k => { if (i[k] !== undefined && i[k] !== null) o[k] = i[k]; });
    o.name = String(o.name || "").slice(0, 80);
    if (typeof o.img === "string" && o.img.length > 400) o.img = "";
    return o;
  }
  const json = o => JSON.stringify(canon(o), FIELDS);

  /* ---------- conexión con el servidor de la app (funciones de Netlify) ---------- */
  // Cada teléfono pregunta cada pocos segundos si la lista cambió. Si no cambió, la respuesta es mínima.
  const FAST = 3000, SLOW = 8000, CALM_AFTER = 2 * 60 * 1000;
  async function getBackend() {
    if (backend) return backend;
    if (window.__SHARE_MOCK) return (backend = window.__SHARE_MOCK);
    const call = async (path, body) => {
      const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404) { const e = new Error("not-found"); e.code = "not-found"; throw e; }
      if (!r.ok) { const e = new Error(d.error || "server"); e.code = "server"; throw e; }
      return d;
    };
    let live = null, version = -1, lastChange = Date.now(), pollNow = null;
    const inflight = [];
    const applyTo = (map, set, del) => { Object.entries(set || {}).forEach(([k, v]) => { map[k] = v; }); (del || []).forEach(k => { delete map[k]; }); };
    backend = {
      async get(code) {
        try { const d = await call("/api/list-get?code=" + encodeURIComponent(code)); return { items: d.items || {}, v: d.v }; }
        catch (e) { if (e.code === "not-found") return null; throw e; }
      },
      async create(code, itemsMap) { await call("/api/list-create", { code, items: itemsMap }); },
      async update(code, set, del) {
        const change = { set, del };
        inflight.push(change);
        if (live) applyTo(live, set, del);
        lastChange = Date.now();
        try { await call("/api/list-update", { code, set, del }); }
        finally { inflight.splice(inflight.indexOf(change), 1); }
        if (pollNow) setTimeout(pollNow, 400); // trae enseguida lo que hayan cambiado los demás
      },
      listen(code, onData) {
        let stopped = false, timer = null, busy = false;
        live = null; version = -1;
        const poll = async () => {
          clearTimeout(timer);
          if (stopped) return;
          if (document.hidden) { schedule(); return; }   // con la app en segundo plano no se pregunta
          if (busy) return;
          busy = true;
          try {
            const d = await call("/api/list-get?code=" + encodeURIComponent(code) + "&v=" + version);
            if (stopped) return;
            if (!d.same) {
              version = d.v; live = d.items || {};
              inflight.forEach(c => applyTo(live, c.set, c.del)); // lo que aún viaja al servidor no se pierde
              lastChange = Date.now();
              onData({ items: live }, false);
            } else if (status !== "live") onData({ items: live || {} }, false);
          } catch (e) {
            if (!stopped) { if (e.code === "not-found") onData(null, false); else onData(live ? { items: live } : null, true); }
          } finally { busy = false; }
          schedule();
        };
        const schedule = () => { clearTimeout(timer); if (!stopped) timer = setTimeout(poll, Date.now() - lastChange < CALM_AFTER ? FAST : SLOW); };
        const wake = () => { if (!document.hidden) { lastChange = Date.now(); poll(); } };
        pollNow = poll;
        document.addEventListener("visibilitychange", wake);
        window.addEventListener("focus", wake);
        window.addEventListener("online", wake);
        poll();
        return () => {
          stopped = true; clearTimeout(timer); live = null; pollNow = null;
          document.removeEventListener("visibilitychange", wake); window.removeEventListener("focus", wake); window.removeEventListener("online", wake);
        };
      },
    };
    return backend;
  }

  /* ---------- escuchar los cambios de los demás ---------- */
  function listen() {
    if (!info) return;
    if (unsub) { try { unsub(); } catch {} unsub = null; }
    setStatus("connecting");
    unsub = backend.listen(info.code, (data, fromCache) => {
      if (!data) { if (fromCache) setStatus("offline"); else setStatus("gone"); return; }
      const map = data.items || {};
      lastRemote = {};
      Object.keys(map).forEach(k => { lastRemote[k] = json(map[k]); });
      // Cambios que este teléfono hizo y aún no llegan a la nube se conservan.
      const local = window.MiLista.getItems();
      const merged = Object.values(map).map(x => Object.assign({}, x));
      const unsent = pendingLocal(local);
      unsent.set.forEach(i => { const idx = merged.findIndex(m => m.id === i.id); if (idx >= 0) merged[idx] = i; else merged.push(i); });
      const final = merged.filter(m => !unsent.del.includes(m.id));
      applying = true;
      try { window.MiLista.setItems(final); } finally { applying = false; }
      setStatus(fromCache ? "offline" : "live");
    }, err => { setStatus("error"); console.warn("lista compartida:", err && err.code); });
  }
  let pendingSet = new Map(), pendingDel = new Set();
  function pendingLocal() { return { set: Array.from(pendingSet.values()), del: Array.from(pendingDel) }; }

  /* ---------- enviar los cambios de este teléfono ---------- */
  function onLocalChange(items) {
    if (applying || !info || !backend) return;
    const now = {};
    items.forEach(i => { now[i.id] = json(i); });
    Object.keys(now).forEach(id => { if (now[id] !== lastRemote[id]) { pendingSet.set(id, canon(items.find(i => i.id === id))); pendingDel.delete(id); } });
    Object.keys(lastRemote).forEach(id => { if (!(id in now)) { pendingDel.add(id); pendingSet.delete(id); } });
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, 120);
  }
  async function push() {
    if (!info || !backend || (!pendingSet.size && !pendingDel.size)) return;
    const set = {}, del = Array.from(pendingDel);
    pendingSet.forEach((v, k) => { set[k] = v; });
    // Se marcan como enviados de inmediato (la conexión los guarda aunque no haya señal).
    Object.keys(set).forEach(k => { lastRemote[k] = json(set[k]); });
    del.forEach(k => { delete lastRemote[k]; });
    pendingSet = new Map(); pendingDel = new Set();
    try { await backend.update(info.code, set, del); if (status !== "live") setStatus("live"); }
    catch (e) {
      if (e && e.code === "not-found") { setStatus("gone"); return; }
      // Sin señal: se vuelven a poner en la fila y se reintenta.
      Object.keys(set).forEach(k => { if (!pendingSet.has(k) && !pendingDel.has(k)) { pendingSet.set(k, set[k]); delete lastRemote[k]; } });
      del.forEach(k => { if (!pendingSet.has(k)) { pendingDel.add(k); lastRemote[k] = "__pendiente__"; } });
      setStatus("offline");
      clearTimeout(retryTimer); retryTimer = setTimeout(push, 8000);
    }
  }
  let retryTimer = null;
  window.addEventListener("online", () => { if (pendingSet.size || pendingDel.size) push(); });

  /* ---------- crear, unirse, salir ---------- */
  async function createList() {
    setStatus("connecting"); renderSheet();
    try {
      await getBackend();
      const code = newCode();
      const map = {};
      window.MiLista.getItems().forEach(i => { map[i.id] = canon(i); });
      await backend.create(code, map);
      info = { code, owner: true }; saveInfo();
      lastRemote = {}; Object.keys(map).forEach(k => { lastRemote[k] = json(map[k]); });
      listen();
      renderSheet();
      invite();
    } catch (e) {
      setStatus("error"); renderSheet();
      window.MiLista.toast("No se pudo crear la lista compartida. Revisa tu conexión.");
    }
  }
  async function join(codeRaw) {
    const code = cleanCode(codeRaw);
    if (code.length !== 12) { window.MiLista.toast("El código tiene 12 letras y números."); return; }
    if (info && info.code === code) { openSheet(); return; }
    setStatus("connecting"); renderSheet();
    try {
      await getBackend();
      const data = await backend.get(code);
      if (!data) { setStatus(info ? status : "off"); renderSheet(); window.MiLista.toast("No encontré esa lista. Revisa el código."); return; }
      const remote = Object.values(data.items || {});
      const ok = await confirmJoin(remote.length);
      if (!ok) { setStatus(info ? "live" : "off"); renderSheet(); return; }
      if (unsub) { try { unsub(); } catch {} unsub = null; }
      info = { code }; saveInfo();
      lastRemote = {}; remote.forEach(r => { lastRemote[r.id] = json(r); });
      // Lo que ya tenías en tu lista se suma a la compartida (sin repetir).
      const names = new Set(remote.filter(r => !r.done).map(r => Categorias.norm(r.name)));
      const mine = window.MiLista.getItems().filter(i => !i.done && !names.has(Categorias.norm(i.name)));
      window.MiLista.setItems(remote.concat(mine)); // esto envía tus productos a la lista compartida
      listen();
      $("shJoinIn").value = "";
      closeSheet();
      window.MiLista.toast("Te uniste a la lista compartida" + (mine.length === 1 ? ". Se agregó tu producto." : mine.length ? ". Se agregaron tus " + mine.length + " productos." : "."));
    } catch (e) {
      setStatus(info ? "error" : "off"); renderSheet();
      window.MiLista.toast("No se pudo abrir la lista compartida. Revisa tu conexión.");
    }
  }
  function leave() {
    if (unsub) { try { unsub(); } catch {} unsub = null; }
    info = null; saveInfo(); lastRemote = {}; pendingSet = new Map(); pendingDel = new Set();
    setStatus("off"); closeSheet();
    window.MiLista.toast("Saliste de la lista compartida. Tu copia se queda en este teléfono.");
  }
  function inviteText() {
    const url = location.origin + location.pathname + "?unirse=" + info.code;
    if (window.I18N && I18N.lang() === "en")
      return "🛒 I'm sharing my grocery list with you. Whatever we add or check off shows on both phones.\n\n" +
        "Open it here (in Safari or Chrome): " + url + "\n\nOr in the app: Shared list → I was invited → type the code " + pretty(info.code);
    return "🛒 Te comparto mi lista del súper. Lo que agreguemos o marquemos se verá en los dos teléfonos.\n\n" +
      "Ábrela aquí (en Safari o Chrome): " + url + "\n\nO en la app: Lista compartida → Me invitaron → escribe el código " + pretty(info.code);
  }
  async function invite() {
    const text = inviteText();
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    location.href = "https://wa.me/?text=" + encodeURIComponent(text);
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(pretty(info.code)); window.MiLista.toast("Código copiado"); }
    catch { window.MiLista.toast("Código: " + pretty(info.code)); }
  }

  /* ---------- pantalla ---------- */
  const STATUS_TXT = {
    connecting: "Conectando…", live: "Conectada: los cambios aparecen en los otros teléfonos en unos segundos",
    offline: "Sin conexión: tus cambios se enviarán al volver la señal", error: "No se pudo conectar. Se reintentará.",
    gone: "Esta lista compartida ya no existe", off: "",
  };
  function setStatus(s) {
    status = s;
    const dot = $("shDot"), sub = $("shLinkSub");
    if (!info) { dot.classList.add("hidden"); sub.textContent = "Compártela con tu familia desde su teléfono"; }
    else {
      dot.classList.remove("hidden"); dot.dataset.s = s;
      sub.textContent = s === "live" ? "Compartida · al día" : s === "offline" ? "Compartida · sin conexión" : s === "connecting" ? "Compartida · conectando…" : "Compartida · revisa la conexión";
    }
    if (!$("shSheet").classList.contains("hidden")) renderSheet();
  }
  function btn(label, cls, fn) { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = label; b.onclick = fn; return b; }
  function renderSheet() {
    const acts = $("shActions");
    $("shStatus").classList.add("hidden"); $("shCodeBox").classList.add("hidden"); $("shJoinBox").classList.add("hidden");
    if (!configured()) {
      $("shText").textContent = "La lista compartida todavía no está activada en esta app. (La lista compartida funciona cuando la app está publicada en Netlify.)";
      acts.replaceChildren(btn("Cerrar", "sh-ghost", closeSheet));
      return;
    }
    if (!info) {
      $("shText").textContent = "Toca Compartir mi lista y la app te dará un código para invitar a tu familia. Cuando alguien agregue, quite o marque un producto, el cambio aparecerá en los demás teléfonos en unos segundos.";
      // Unirse con código es para quien RECIBE la invitación: queda escondido detrás de su propio botón.
      const joinBtn = btn("Me invitaron: tengo un código", "sh-ghost", () => {
        $("shJoinBox").classList.remove("hidden");
        joinBtn.remove();
        setTimeout(() => $("shJoinIn").focus(), 50);
      });
      acts.replaceChildren(
        btn(status === "connecting" ? "Creando…" : "Compartir mi lista", "sh-primary", () => { if (status !== "connecting") createList(); }),
        joinBtn,
        btn("Cerrar", "sh-ghost", closeSheet));
      return;
    }
    $("shText").textContent = "Esta lista está compartida. Invita a quien quieras con el enlace o el código.";
    $("shStatus").classList.remove("hidden"); $("shStatusDot").dataset.s = status; $("shStatusTxt").textContent = STATUS_TXT[status] || "";
    $("shCodeBox").classList.remove("hidden"); $("shCode").textContent = pretty(info.code);
    acts.replaceChildren(
      btn("Invitar a alguien", "sh-primary", invite),
      btn("Copiar código", "sh-ghost", copyCode),
      btn("Salir de la lista compartida", "sh-danger", async () => {
        const ok = await confirmLeave(); if (ok) leave();
      }),
      btn("Cerrar", "sh-ghost", closeSheet));
  }
  function confirmSheet(title, text, okLabel, danger) {
    return new Promise(resolve => {
      $("shTitle").textContent = title; $("shText").textContent = text;
      $("shStatus").classList.add("hidden"); $("shCodeBox").classList.add("hidden"); $("shJoinBox").classList.add("hidden");
      $("shActions").replaceChildren(
        btn(okLabel, danger ? "sh-danger" : "sh-primary", () => { $("shTitle").textContent = "Lista compartida"; resolve(true); }),
        btn("Cancelar", "sh-ghost", () => { $("shTitle").textContent = "Lista compartida"; renderSheet(); resolve(false); }));
      $("shSheet").classList.remove("hidden");
    });
  }
  const confirmJoin = n => confirmSheet("Te invitaron a una lista",
    "Es una lista compartida con " + (n === 1 ? "1 producto" : n + " productos") + ". Al unirte, tus productos pendientes se agregan a ella y los cambios se verán en todos los teléfonos en unos segundos.", "Unirme a la lista");
  const confirmLeave = () => confirmSheet("¿Salir de la lista compartida?",
    "Te quedas con una copia en este teléfono, pero tus cambios ya no se verán en los otros teléfonos.", "Salir", true);
  function openSheet() { $("shTitle").textContent = "Lista compartida"; renderSheet(); $("shSheet").classList.remove("hidden"); }
  function closeSheet() { $("shSheet").classList.add("hidden"); }
  $("shareLiveBtn").onclick = openSheet;
  $("shSheet").addEventListener("click", e => { if (e.target === $("shSheet")) closeSheet(); });
  $("shJoinBtn").onclick = () => join($("shJoinIn").value);
  $("shJoinIn").addEventListener("keydown", e => { if (e.key === "Enter") join($("shJoinIn").value); });

  /* ---------- inicio ---------- */
  async function resume() {
    if (!info || !configured()) { setStatus(info ? "error" : "off"); return; }
    try { await getBackend(); listen(); }
    catch { setStatus("offline"); }
  }
  window.addEventListener("online", () => { if (info && !unsub) resume(); });
  window.ListShare = { onLocalChange, status: () => status, info: () => info };

  const params = new URLSearchParams(location.search);
  const inviteCode = params.get("unirse");
  if (inviteCode) { history.replaceState(null, "", location.pathname); }
  setStatus(info ? "connecting" : "off");
  resume().then(() => { if (inviteCode && configured()) join(inviteCode); });
})();
