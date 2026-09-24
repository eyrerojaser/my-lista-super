(function () {
  const LS_KEY = "grocery-list-v1";
  const $ = id => document.getElementById(id);
  let items = [];
  let lastNewId = null;

  /* ---------- guardado en el teléfono ---------- */
  function load() {
    try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(items)); } catch {}
  }
  // Pide al navegador que no borre los datos de la app para liberar espacio.
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  /* ---------- modelo ---------- */
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // Agrega un producto o suma 1 si ya está pendiente. Devuelve una función para deshacer.
  function addProduct(p) {
    const name = String(p.name || "").trim().slice(0, 80);
    if (!name) return null;
    const same = items.find(i => !i.done && ((p.code && i.code === p.code) || norm(i.name) === norm(name)));
    if (same) {
      same.qty = (same.qty || 1) + 1; lastNewId = same.id;
      render(); save();
      return () => { same.qty = Math.max(1, same.qty - 1); render(); save(); };
    }
    const it = {
      id: uid(), name, detail: p.detail || "", emoji: p.emoji || Products.emojiFor([], name),
      img: p.img || "", code: p.code || "", pending: !!p.pending, qty: 1, done: false, t: Date.now(),
    };
    items.unshift(it); lastNewId = it.id;
    render(); save();
    return () => { items = items.filter(i => i.id !== it.id); render(); save(); };
  }
  function toggle(id) {
    const it = items.find(i => i.id === id); if (!it) return;
    it.done = !it.done; it.t = Date.now();
    if (navigator.vibrate) navigator.vibrate(12);
    render(); save();
  }
  function changeQty(id, d) {
    const it = items.find(i => i.id === id); if (!it) return;
    it.qty = Math.max(0, (it.qty || 1) + d);
    if (it.qty === 0) {
      const idx = items.indexOf(it);
      items.splice(idx, 1);
      toast("Quitaste " + it.name, () => { it.qty = 1; items.splice(idx, 0, it); render(); save(); });
    }
    render(); save();
  }

  /* ---------- pantalla ---------- */
  function thumb(it) {
    const t = document.createElement("span"); t.className = "thumb";
    if (it.img) {
      const img = document.createElement("img");
      img.src = it.img; img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.onerror = () => { t.textContent = it.emoji || "🛒"; };
      t.append(img);
    } else t.textContent = it.emoji || "🛒";
    return t;
  }
  function row(it) {
    const li = document.createElement("li");
    li.className = "item" + (it.done ? " done" : "") + (it.id === lastNewId ? " new" : "");
    const nm = document.createElement("button"); nm.type = "button"; nm.className = "name";
    nm.textContent = it.name;
    const sub = [it.detail, !it.done && it.qty > 1 ? it.qty + " unidades" : "", it.pending ? "Se identificará con internet" : ""].filter(Boolean).join(" · ");
    if (sub) { const s = document.createElement("small"); s.textContent = sub; nm.append(s); }
    nm.onclick = () => toggle(it.id);
    li.append(thumb(it), nm);
    if (!it.done) {
      const q = document.createElement("div"); q.className = "qty";
      const minus = document.createElement("button"); minus.className = "icon"; minus.type = "button";
      minus.textContent = it.qty > 1 ? "−" : "×"; minus.setAttribute("aria-label", it.qty > 1 ? "Uno menos" : "Quitar");
      minus.onclick = () => changeQty(it.id, -1);
      const n = document.createElement("span"); n.textContent = it.qty > 1 ? it.qty : "";
      const plus = document.createElement("button"); plus.className = "icon"; plus.type = "button";
      plus.textContent = "+"; plus.setAttribute("aria-label", "Uno más");
      plus.onclick = () => changeQty(it.id, 1);
      q.append(minus, n, plus); li.append(q);
    }
    const chk = document.createElement("button");
    chk.className = "check"; chk.type = "button";
    chk.setAttribute("aria-label", (it.done ? "Marcar como pendiente: " : "Marcar como comprado: ") + it.name);
    chk.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    chk.onclick = () => toggle(it.id);
    li.append(chk);
    return li;
  }
  function render() {
    const todo = items.filter(i => !i.done);
    const done = items.filter(i => i.done).sort((a, b) => b.t - a.t);
    $("todo").replaceChildren(...todo.map(row));
    $("done").replaceChildren(...done.map(row));
    $("empty").classList.toggle("hidden", items.length > 0);
    $("doneHead").classList.toggle("hidden", done.length === 0);
    $("doneCount").textContent = done.length === 1 ? "1 en el carrito" : done.length + " en el carrito";
    $("count").textContent = !items.length ? "" : todo.length === 0 ? "¡Todo listo! 🎉" :
      todo.length === 1 ? "Falta 1" : "Faltan " + todo.length;
    const pct = items.length ? Math.round(done.length / items.length * 100) : 0;
    $("barFill").style.width = pct + "%";
    $("bar").classList.toggle("hidden", !items.length);
    $("ringArc").style.strokeDashoffset = 113.1 * (1 - pct / 100);
    $("ringTxt").textContent = pct + "%";
    $("stTodo").textContent = todo.length;
    $("stDone").textContent = done.length;
    $("stTotal").textContent = todo.reduce((n, i) => n + (i.qty || 1), 0);
    $("shareBtn").classList.toggle("hidden", !todo.length);
    $("downloadBtn").classList.toggle("hidden", !items.length);
    lastNewId = null;
  }

  /* ---------- aviso con deshacer ---------- */
  let toastTimer = null;
  function toast(msg, undo) {
    $("toastTxt").textContent = msg;
    const b = $("toastUndo");
    b.classList.toggle("hidden", !undo);
    b.onclick = () => { if (undo) undo(); hideToast(); };
    $("toast").classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4500);
  }
  function hideToast() { $("toast").classList.add("hidden"); }

  /* ---------- hoja para escribir ---------- */
  function askText({ title, text, placeholder, numeric, ok, preview }) {
    return new Promise(resolve => {
      $("sheetTitle").textContent = title;
      $("sheetText").textContent = text || "";
      const inp = $("sheetIn");
      const confirmOnly = !!preview;
      inp.classList.toggle("hidden", confirmOnly);
      document.querySelector(".sheet-list")?.remove();
      if (preview) {
        const ul = document.createElement("ul"); ul.className = "sheet-list";
        preview.forEach(p => {
          const li = document.createElement("li");
          const e = document.createElement("span"); e.textContent = p.emoji || "🛒";
          const n = document.createElement("span"); n.textContent = p.name;
          li.append(e, n);
          if (p.qty > 1) { const q = document.createElement("small"); q.textContent = "×" + p.qty; li.append(q); }
          ul.append(li);
        });
        inp.before(ul);
      }
      inp.value = ""; inp.placeholder = placeholder || "";
      inp.inputMode = numeric ? "numeric" : "text";
      inp.enterKeyHint = "done";
      $("sheetOk").textContent = ok || "Agregar";
      $("sheet").classList.remove("hidden");
      if (!confirmOnly) setTimeout(() => inp.focus(), 60);
      const finish = v => {
        $("sheet").classList.add("hidden");
        $("sheetForm").onsubmit = null; $("sheetCancel").onclick = null;
        resolve(v);
      };
      $("sheetForm").onsubmit = e => { e.preventDefault(); if (confirmOnly) return finish(true); const v = inp.value.trim(); if (v) finish(v); };
      $("sheetCancel").onclick = () => finish(null);
    });
  }

  /* ---------- sonido de confirmación ---------- */
  let audio = null;
  function beep(ok = true) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain();
      o.frequency.value = ok ? 1320 : 440; o.type = "sine";
      g.gain.setValueAtTime(0.0001, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.14);
      o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + 0.15);
    } catch {}
  }

  /* ---------- escáner ---------- */
  const scanner = new BarcodeScanner($("video"));
  let scanning = false, scannedCount = 0;
  const recent = new Map(); // código -> hora, para no sumar dos veces el mismo escaneo

  function scMsg(t) { $("scMsg").textContent = t || ""; }
  function scCount() {
    $("scCount").textContent = scannedCount === 0 ? "Apunta al código" :
      scannedCount === 1 ? "1 producto agregado" : scannedCount + " productos agregados";
  }
  function showLast(p, sub, undo) {
    const box = $("scLast");
    box.replaceChildren();
    box.append(thumb(p));
    const txt = document.createElement("div"); txt.className = "txt";
    const b = document.createElement("b"); b.textContent = p.name;
    const s = document.createElement("small"); s.textContent = sub;
    txt.append(b, s); box.append(txt);
    if (undo) {
      const u = document.createElement("button"); u.type = "button"; u.className = "undo"; u.textContent = "Deshacer";
      u.onclick = () => { undo(); scannedCount = Math.max(0, scannedCount - 1); scCount(); box.classList.add("hidden"); };
      box.append(u);
    }
    box.classList.remove("hidden");
  }
  function flash() {
    const w = document.querySelector(".window");
    w.classList.add("hit"); setTimeout(() => w.classList.remove("hit"), 450);
  }

  async function handleCode(code) {
    // Mientras el mismo código siga frente a la cámara no se vuelve a sumar.
    // Para agregar otra unidad, aleja la cámara un momento y vuelve a escanear (o usa +).
    const now = Date.now();
    const seen = recent.get(code);
    recent.set(code, now);
    if (seen && now - seen < 2500) return;
    scanner.pause(1600);
    flash(); beep(true);
    if (navigator.vibrate) navigator.vibrate(40);
    showLast({ name: "Buscando producto…", emoji: "🔎" }, "Código " + code);
    scMsg("");

    const res = await Products.lookup(code);
    if (res.status === "found") {
      const undo = addProduct(res.product);
      scannedCount++; scCount();
      showLast(res.product, "Agregado a tu lista", undo);
      return;
    }
    if (res.status === "offline") {
      const p = { name: "Producto " + code, code, emoji: "📦", pending: true };
      const undo = addProduct(p);
      scannedCount++; scCount();
      showLast(p, "Sin internet: se identificará al volver la conexión", undo);
      return;
    }
    // No está en ninguna base de datos: se pregunta el nombre una sola vez.
    beep(false);
    scanner.pause(60000);
    $("scLast").classList.add("hidden");
    const name = await askText({
      title: "Producto nuevo",
      text: "No encontré el código " + code + ". Escribe su nombre y la próxima vez se reconocerá solo.",
      placeholder: "Ej. Salsa Valentina",
      ok: "Guardar y agregar",
    });
    if (name) {
      const p = Products.remember(code, name);
      const undo = addProduct(p);
      scannedCount++; scCount();
      showLast(p, "Guardado y agregado", undo);
    }
    scanner.pause(900);
  }

  async function openScanner() {
    if (scanning) return;
    scanning = true; scannedCount = 0; scCount(); scMsg("Abriendo cámara…");
    $("scLast").classList.add("hidden");
    $("torchBtn").classList.add("hidden");
    $("torchBtn").setAttribute("aria-pressed", "false");
    document.querySelector(".sc-error")?.remove();
    $("scanner").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch {}
    try {
      await scanner.start(code => handleCode(code));
      scMsg("Coloca el código de barras dentro del recuadro");
      if (scanner.hasTorch()) $("torchBtn").classList.remove("hidden");
    } catch (e) {
      scMsg("");
      const msgs = {
        NotAllowedError: ["Permite el acceso a la cámara", "Ve a los ajustes del navegador o del teléfono, permite la cámara para este sitio y vuelve a intentarlo. Mientras, puedes teclear el código."],
        NotFoundError: ["No se encontró una cámara", "Puedes teclear el código de barras."],
        NotReadableError: ["La cámara está ocupada", "Cierra otras apps que la estén usando y vuelve a intentarlo."],
        InsecureContext: ["Se necesita una conexión segura", "Abre la app desde su dirección https:// para usar la cámara."],
      };
      const [t, p] = msgs[e && e.name] || ["No se pudo abrir la cámara", "Vuelve a intentarlo o teclea el código de barras."];
      const box = document.createElement("div"); box.className = "sc-error";
      box.innerHTML = "<div><b></b><p></p></div>";
      box.querySelector("b").textContent = t; box.querySelector("p").textContent = p;
      $("scanner").insertBefore(box, $("scanner").querySelector(".sc-top"));
    }
  }
  function closeScanner() {
    if (!scanning) return;
    scanning = false;
    scanner.stop();
    $("scanner").classList.add("hidden");
    document.body.style.overflow = "";
    if (scannedCount) toast(scannedCount === 1 ? "1 producto agregado" : scannedCount + " productos agregados");
  }

  $("scanBtn").onclick = openScanner;
  $("fab").onclick = openScanner;
  $("closeScan").onclick = closeScanner;
  $("doneScan").onclick = closeScanner;
  $("torchBtn").onclick = async () => {
    const on = $("torchBtn").getAttribute("aria-pressed") !== "true";
    if (await scanner.setTorch(on)) $("torchBtn").setAttribute("aria-pressed", String(on));
  };
  $("typeCode").onclick = async () => {
    scanner.pause(60000);
    const v = await askText({ title: "Teclear código", text: "Escribe los números debajo del código de barras.", placeholder: "7501055300075", numeric: true, ok: "Buscar" });
    scanner.pause(500);
    if (v) { const code = v.replace(/\D/g, ""); if (code.length >= 6) { recent.delete(code); handleCode(code.length === 12 ? "0" + code : code); } }
  };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!$("sheet").classList.contains("hidden")) $("sheetCancel").click();
      else closeScanner();
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) closeScanner(); });

  /* ---------- productos pendientes al volver internet ---------- */
  async function resolvePending() {
    const pend = items.filter(i => i.pending && i.code);
    for (const it of pend) {
      const res = await Products.lookup(it.code);
      if (res.status === "found") {
        Object.assign(it, { name: res.product.name, detail: res.product.detail, emoji: res.product.emoji, img: res.product.img, pending: false });
      } else if (res.status === "unknown") {
        it.pending = false; it.name = "Código " + it.code;
      }
    }
    if (pend.length) { render(); save(); }
  }
  window.addEventListener("online", resolvePending);

  /* ---------- enviar la lista (WhatsApp, mensajes, etc.) ---------- */
  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function fromB64(b64) {
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
  function buildShare() {
    const todo = items.filter(i => !i.done);
    const packed = todo.map(i => [i.name, i.qty || 1, i.emoji || "", i.code || "", i.detail || ""]);
    const link = location.origin + location.pathname + "?lista=" + toB64(JSON.stringify(packed));
    const lines = todo.map(i => "▫️ " + (i.emoji ? i.emoji + " " : "") + i.name + (i.qty > 1 ? " (×" + i.qty + ")" : ""));
    const text = "🛒 Lista del súper (" + todo.length + (todo.length === 1 ? " producto" : " productos") + ")\n\n" +
      lines.join("\n") + "\n\nÁbrela en la app para ir marcando: " + link;
    return { text, link };
  }
  $("shareBtn").onclick = async () => {
    const { text } = buildShare();
    if (navigator.share) {
      try { await navigator.share({ text }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    // Sin menú de compartir: abre WhatsApp directamente con el mensaje.
    location.href = "https://wa.me/?text=" + encodeURIComponent(text);
  };

  /* ---------- descargar la lista al teléfono ---------- */
  function listFile() {
    const d = new Date();
    const pad = n => String(n).padStart(2, "0");
    const stamp = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const fecha = d.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const line = (i, box) => box + " " + i.name + (i.qty > 1 ? " (×" + i.qty + ")" : "") + (i.detail ? " — " + i.detail : "");
    const todo = items.filter(i => !i.done);
    const done = items.filter(i => i.done);
    let text = "MI LISTA DEL SÚPER\n" + fecha.charAt(0).toUpperCase() + fecha.slice(1) + "\n\n";
    text += "POR COMPRAR (" + todo.length + ")\n" + (todo.length ? todo.map(i => line(i, "☐")).join("\n") : "Nada pendiente") + "\n";
    if (done.length) text += "\nEN EL CARRITO (" + done.length + ")\n" + done.map(i => line(i, "☑")).join("\n") + "\n";
    const name = "lista-super-" + stamp + ".txt";
    return { name, blob: new Blob(["\ufeff" + text], { type: "text/plain;charset=utf-8" }) };
  }
  $("downloadBtn").onclick = async () => {
    const { name, blob } = listFile();
    // En iPhone se usa el menú de compartir, que tiene "Guardar en Archivos".
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && navigator.canShare) {
      try {
        const file = new File([blob], name, { type: "text/plain" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Mi lista del súper" });
          return;
        }
      } catch (e) { if (e && e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Lista guardada en Descargas");
  };

  // Al abrir un enlace de lista enviada, ofrece agregarla.
  async function importFromLink() {
    const params = new URLSearchParams(location.search);
    const raw = params.get("lista");
    if (!raw) return;
    history.replaceState(null, "", location.pathname);
    let incoming = [];
    try {
      incoming = JSON.parse(fromB64(raw))
        .filter(x => Array.isArray(x) && typeof x[0] === "string" && x[0].trim())
        .slice(0, 200)
        .map(([name, qty, emoji, code, detail]) => ({
          name: String(name).slice(0, 80), qty: Math.max(1, Math.min(99, parseInt(qty) || 1)),
          emoji: String(emoji || "").slice(0, 4), code: String(code || "").slice(0, 32), detail: String(detail || "").slice(0, 40),
        }));
    } catch { incoming = []; }
    if (!incoming.length) { toast("El enlace de la lista no es válido"); return; }
    const ok = await askText({
      title: "Te enviaron una lista",
      text: incoming.length === 1 ? "1 producto para agregar a tu lista:" : incoming.length + " productos para agregar a tu lista:",
      preview: incoming,
      ok: "Agregar a mi lista",
    });
    if (!ok) return;
    incoming.slice().reverse().forEach(p => {
      const same = items.find(i => !i.done && ((p.code && i.code === p.code) || norm(i.name) === norm(p.name)));
      if (same) { same.qty = Math.max(same.qty || 1, p.qty); return; }
      items.unshift({ id: uid(), name: p.name, detail: p.detail, emoji: p.emoji || Products.emojiFor([], p.name),
        img: "", code: p.code, pending: false, qty: p.qty, done: false, t: Date.now() });
    });
    render(); save();
    toast(incoming.length === 1 ? "Se agregó 1 producto" : "Se agregaron " + incoming.length + " productos");
  }

  /* ---------- manual ---------- */
  $("manualForm").onsubmit = e => {
    e.preventDefault();
    const v = $("typeIn").value.trim(); if (!v) return;
    addProduct({ name: v }); $("typeIn").value = "";
  };
  $("clearDone").onclick = () => {
    const before = items.slice();
    const n = items.filter(i => i.done).length;
    items = items.filter(i => !i.done); render(); save();
    toast(n === 1 ? "Quitaste 1 producto" : "Quitaste " + n + " productos", () => { items = before; render(); save(); });
  };

  /* ---------- botón flotante ---------- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => $("fab").classList.toggle("show", !e.isIntersecting)).observe($("scanBtn"));
  }

  /* ---------- instalación ---------- */
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferredPrompt = e;
    $("installBtn").classList.remove("hidden");
  });
  $("installBtn").onclick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null; $("installBtn").classList.add("hidden");
  };
  window.addEventListener("appinstalled", () => $("installBtn").classList.add("hidden"));
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let hintSeen = false; try { hintSeen = localStorage.getItem("ios-hint-seen") === "1"; } catch {}
  if (isIOS && !standalone && !hintSeen) $("iosHint").classList.remove("hidden");
  $("iosHintClose").onclick = () => { $("iosHint").classList.add("hidden"); try { localStorage.setItem("ios-hint-seen", "1"); } catch {} };

  /* ---------- inicio ---------- */
  const h = new Date().getHours();
  $("greet").textContent = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  items = load();
  render();
  if (navigator.onLine) resolvePending();
  BarcodeScanner.preload();
  if (new URLSearchParams(location.search).get("scan") === "1") openScanner();
  importFromLink();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
