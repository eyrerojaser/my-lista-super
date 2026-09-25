/* Freezer Scan: sección aparte para llevar la cuenta de los productos congelados.
   No toca Mi lista ni su escáner: usa su propia pantalla, sus propios escáneres y su propio guardado. */
(function () {
  const KEY = "freezer-items-v1";
  const PUSH_KEY = "freezer-push-v1";
  const LOCAL_NOTIFIED = "freezer-local-notified-v1";
  const WARN_DAYS = 3;
  const $ = id => document.getElementById(id);
  let items = [];
  let lastNewId = null;

  /* ---------- guardado ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
    syncSoon();
  }
  const uid = () => "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- fechas ---------- */
  function todayISO() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dayNum(iso) { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d) / 864e5; }
  function daysLeft(iso) { return Math.round(dayNum(iso) - dayNum(todayISO())); }
  function fmtDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
  }
  function daysText(n) {
    if (n > 1) return "Quedan " + n + " días";
    if (n === 1) return "Queda 1 día";
    if (n === 0) return "Vence hoy";
    if (n === -1) return "Venció ayer";
    return "Venció hace " + -n + " días";
  }
  const ENTRY_DAYS = 90; // sin fecha impresa: usar dentro de 3 meses desde que entró al freezer
  function addDays(iso, n) {
    const [y, m, d] = iso.split("-").map(Number); const t = new Date(y, m - 1, d + n);
    return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  }
  const dueOf = it => it.due || (it.type === "entry" ? addDays(it.date, ENTRY_DAYS) : it.date);
  function dateLine(it) {
    if (it.type === "entry") return "Entró: " + fmtDate(it.date) + " · usar antes del " + fmtDate(dueOf(it));
    const label = (window.FreezerDate && FreezerDate.TYPE_LABEL[it.type]) || "Fecha";
    return label + ": " + fmtDate(it.date);
  }
  function addMonths(months) {
    const d = new Date(); const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + months);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------- pantalla ---------- */
  function thumb(p) {
    const t = document.createElement("span"); t.className = "thumb";
    if (p.img) {
      const img = document.createElement("img"); img.src = p.img; img.alt = ""; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.onerror = () => { t.textContent = p.emoji || "🧊"; };
      t.append(img);
    } else t.textContent = p.emoji || "🧊";
    return t;
  }
  function row(it, first) {
    const due = dueOf(it);
    const n = daysLeft(due);
    const total = Math.max(1, dayNum(due) - dayNum(it.added || todayISO()));
    const pct = Math.max(0, Math.min(100, (n / total) * 100));
    const li = document.createElement("li");
    li.className = "fz-item" + (n <= WARN_DAYS ? " urgent" : n <= 7 ? " soon" : "") + (it.id === lastNewId ? " new" : "");
    const r = document.createElement("div"); r.className = "fz-row";
    const info = document.createElement("div"); info.className = "fz-info";
    const b = document.createElement("b"); b.textContent = it.name;
    const s = document.createElement("small"); s.textContent = dateLine(it);
    info.append(b, s);
    if (first) { const c = document.createElement("span"); c.className = "fz-first"; c.textContent = "Usar primero"; info.append(c); }
    const used = document.createElement("button"); used.type = "button"; used.className = "fz-used"; used.textContent = "Usado";
    used.setAttribute("aria-label", "Marcar como usado y quitar: " + it.name);
    used.onclick = () => removeItem(it.id);
    r.append(thumb(it), info, used);
    const meter = document.createElement("div"); meter.className = "fz-meter";
    const bar = document.createElement("div"); bar.className = "fz-bar";
    bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-valuemin", "0"); bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-valuenow", String(Math.round(pct))); bar.setAttribute("aria-label", "Tiempo restante");
    const fill = document.createElement("div"); fill.style.width = (n < 0 ? 100 : Math.max(pct, 3)) + "%";
    bar.append(fill);
    const days = document.createElement("span"); days.className = "fz-days"; days.textContent = daysText(n);
    meter.append(bar, days);
    li.append(r, meter);
    return li;
  }
  function render() {
    items.sort((a, b) => (dueOf(a) < dueOf(b) ? -1 : dueOf(a) > dueOf(b) ? 1 : 0));
    // "Usar primero": el que vence antes y cualquiera que venza en 3 días o menos.
    $("fzList").replaceChildren(...items.map((it, i) => row(it, items.length > 1 && (i === 0 || daysLeft(dueOf(it)) <= WARN_DAYS))));
    $("fzEmpty").classList.toggle("hidden", items.length > 0);
    $("fzCount").textContent = items.length ? (items.length === 1 ? "1 producto" : items.length + " productos") : "";
    const soon = items.filter(i => daysLeft(dueOf(i)) <= WARN_DAYS);
    const badge = $("fzBadge");
    badge.textContent = soon.length; badge.classList.toggle("hidden", !soon.length);
    const al = $("fzAlert");
    if (soon.length) {
      al.replaceChildren();
      const ic = document.createElement("span"); ic.textContent = "⏰"; ic.style.fontSize = "1.4rem";
      const t = document.createElement("span");
      const b = document.createElement("b"); b.textContent = soon.length === 1 ? "1 producto" : soon.length + " productos";
      t.append(b, document.createTextNode(soon.length === 1 ? " vence en 3 días o menos: " : " vencen en 3 días o menos: "),
        document.createTextNode(soon.slice(0, 3).map(i => i.name).join(", ") + (soon.length > 3 ? "…" : "")));
      al.append(ic, t); al.classList.remove("hidden");
    } else al.classList.add("hidden");
    lastNewId = null;
  }

  function addItem(p, info) {
    if (typeof info === "string") info = { date: info, type: "date" };
    const it = { id: uid(), name: p.name, emoji: p.emoji || "🧊", img: p.img || "", code: p.code || "",
      date: info.date, type: info.type || "date", added: todayISO() };
    it.due = dueOf(it);
    items.push(it); lastNewId = it.id;
    render(); save();
    toast("Guardado en el freezer: " + it.name);
    localCheck();
  }
  function removeItem(id) {
    const idx = items.findIndex(i => i.id === id); if (idx < 0) return;
    const [it] = items.splice(idx, 1);
    render(); save();
    toast("Quitaste " + it.name, () => { items.push(it); render(); save(); });
  }

  /* ---------- aviso y hoja ---------- */
  let toastTimer = null;
  function toast(msg, undo) {
    $("fzToastTxt").textContent = msg;
    const b = $("fzToastUndo"); b.classList.toggle("hidden", !undo);
    b.onclick = () => { if (undo) undo(); $("fzToast").classList.add("hidden"); };
    $("fzToast").classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("fzToast").classList.add("hidden"), 4500);
  }
  function ask({ title, text, type, placeholder, ok, quick, value, noInput }) {
    return new Promise(resolve => {
      $("fzSheetTitle").textContent = title; $("fzSheetText").textContent = text || "";
      const inp = $("fzSheetIn");
      inp.type = type || "text"; inp.value = value || ""; inp.placeholder = placeholder || "";
      inp.classList.toggle("hidden", !!noInput);
      if (type === "date") { inp.min = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10); inp.max = addMonths(72); }
      else { inp.removeAttribute("min"); inp.removeAttribute("max"); }
      $("fzQuick").classList.toggle("hidden", !quick);
      $("fzSheetOk").textContent = ok || "Guardar";
      $("fzSheetCancel").classList.toggle("hidden", !!noInput);
      $("fzSheet").classList.remove("hidden");
      if (!noInput && type !== "date") setTimeout(() => inp.focus(), 60);
      const finish = v => { $("fzSheet").classList.add("hidden"); $("fzSheetForm").onsubmit = null; resolve(v); };
      $("fzSheetForm").onsubmit = e => { e.preventDefault(); if (noInput) return finish(true); const v = inp.value.trim(); if (v) finish(v); };
      $("fzSheetCancel").onclick = () => finish(null);
      $("fzQuick").querySelectorAll("button").forEach(btn => { btn.onclick = () => finish(addMonths(+btn.dataset.months)); });
    });
  }
  function beep() {
    try {
      const a = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = 1180; g.gain.setValueAtTime(0.0001, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, a.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.14);
      o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.15);
    } catch {}
  }
  function camError(e) {
    const msgs = {
      NotAllowedError: "Permite el acceso a la cámara en los ajustes del teléfono.",
      NotFoundError: "No se encontró una cámara.",
      NotReadableError: "La cámara está ocupada por otra app.",
      InsecureContext: "Abre la app desde su dirección https:// para usar la cámara.",
    };
    return msgs[e && e.name] || "No se pudo abrir la cámara.";
  }

  /* ---------- paso 1: escanear el producto (escáner propio de Freezer) ---------- */
  const productScanner = new BarcodeScanner($("fzVideo"));
  let productOpen = false, productResolve = null;
  function openProductScanner() {
    return new Promise(async resolve => {
      productResolve = resolve; productOpen = true;
      $("fzScanFound").classList.add("hidden");
      $("fzScanMsg").textContent = "Abriendo cámara…";
      $("fzScanner").classList.remove("hidden");
      handled = false;
      productScanner.pause(0); // borra cualquier pausa que haya quedado de un escaneo anterior
      try {
        await productScanner.start(async code => {
          if (handled) return; handled = true;
          productScanner.pause(60000);
          FreezerDateReader.warmup(); // prepara el lector de fechas mientras se busca el producto
          beep(); if (navigator.vibrate) navigator.vibrate(40);
          $("fzScanMsg").textContent = "";
          showFound({ name: "Buscando producto…", emoji: "🔎" }, "Código " + code);
          await identify(code);
        });
        $("fzScanMsg").textContent = "Coloca el código de barras dentro del recuadro";
      } catch (e) { $("fzScanMsg").textContent = camError(e) + " Puedes tomar una foto o escribir el nombre."; }
    });
  }
  let handled = false;
  async function identify(code) {
          const res = await Products.lookup(code);
          if (res.status === "found") return finishProduct(res.product);
          const name = await ask({
            title: res.status === "offline" ? "Sin internet" : "Producto nuevo",
            text: (res.status === "offline" ? "No se pudo buscar el código " : "No encontré el código ") + code + ". Escribe su nombre.",
            placeholder: "Ej. Pechuga de pollo", ok: "Continuar",
          });
          if (!name) { handled = false; $("fzScanFound").classList.add("hidden"); productScanner.pause(800); return; }
          finishProduct(res.status === "unknown" ? Products.remember(code, name) : { name, code, emoji: Products.emojiFor([], name) });
  }

  /* ---------- lectura desde foto (más nítida que el video) ---------- */
  let zxingP = null;
  function loadZX() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxingP) zxingP = new Promise((res, rej) => {
      const sc = document.createElement("script"); sc.src = "vendor/zxing.min.js";
      sc.onload = () => res(window.ZXing); sc.onerror = () => { zxingP = null; rej(new Error("zxing")); };
      document.head.appendChild(sc);
    });
    return zxingP;
  }
  const normCode = c => { c = String(c).trim(); return /^\d{12}$/.test(c) ? "0" + c : c; };
  async function barcodeFromPhoto(file) {
    const img = await FreezerDateReader.loadImage(file);
    if ("BarcodeDetector" in window) {
      try {
        const det = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
        const found = await det.detect(img);
        if (found && found.length) return normCode(found[0].rawValue);
      } catch {}
    }
    const Z = await loadZX();
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader(); reader.setHints(hints);
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    for (const size of [1400, 900, 2000]) for (const rot of [0, 90]) {
      const k = Math.min(1, size / Math.max(img.width, img.height));
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      canvas.width = rot ? h : w; canvas.height = rot ? w : h;
      ctx.save();
      if (rot) { ctx.translate(canvas.width / 2, canvas.height / 2); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -w / 2, -h / 2, w, h); }
      else ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();
      try {
        const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
        const r = reader.decodeWithState(bmp);
        if (r) return normCode(r.getText());
      } catch {} finally { reader.reset(); }
    }
    return null;
  }
  $("fzScanPhotoIn").addEventListener("click", () => productScanner.pause(120000));
  $("fzScanPhotoIn").onchange = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) { productScanner.pause(300); return; }
    $("fzScanMsg").textContent = "Buscando el código en la foto…";
    let code = null;
    try { code = await barcodeFromPhoto(file); } catch {}
    if (code && !handled) {
      handled = true; beep(); FreezerDateReader.warmup();
      showFound({ name: "Buscando producto…", emoji: "🔎" }, "Código " + code);
      $("fzScanMsg").textContent = "";
      await identify(code);
    } else {
      $("fzScanMsg").textContent = "No encontré un código en la foto. Acércate más o escribe el nombre.";
      await restartIfEnded(productScanner, () => productScanner.start(c => { if (!handled) { handled = true; productScanner.pause(60000); beep(); FreezerDateReader.warmup(); showFound({ name: "Buscando producto…", emoji: "🔎" }, "Código " + c); identify(c); } }));
      productScanner.pause(300);
    }
  };
  // Si al tomar la foto el teléfono apagó la cámara en vivo, se vuelve a encender.
  async function restartIfEnded(sc, startFn) {
    const tr = sc.stream && sc.stream.getVideoTracks()[0];
    if (!tr || tr.readyState === "ended") { try { sc.stop(); await startFn(); } catch {} }
  }
  function showFound(p, sub) {
    const box = $("fzScanFound"); box.replaceChildren(thumb(p));
    const t = document.createElement("div"); t.className = "txt";
    const b = document.createElement("b"); b.textContent = p.name;
    const s = document.createElement("small"); s.textContent = sub;
    t.append(b, s); box.append(t); box.classList.remove("hidden");
  }
  function closeProductScanner(result) {
    if (!productOpen) return;
    productOpen = false; productScanner.stop();
    $("fzScanner").classList.add("hidden");
    const r = productResolve; productResolve = null; if (r) r(result || null);
  }
  function finishProduct(p) { closeProductScanner(p); }
  $("fzCloseScan").onclick = () => closeProductScanner(null);
  $("fzScanName").onclick = async () => {
    productScanner.pause(60000);
    const name = await ask({ title: "Nombre del producto", text: "Por ejemplo: carne molida, tamales, pan.", placeholder: "Ej. Carne molida", ok: "Continuar" });
    if (name) closeProductScanner({ name, emoji: Products.emojiFor([], name) });
    else productScanner.pause(500);
  };

  /* ---------- paso 2: escáner de fecha (nuevo, solo de Freezer) ---------- */
  const dateReader = new FreezerDateReader($("fzDateVideo"), $("fzDateWin"));
  let dateOpen = false, dateResolve = null, foundDate = null, noDateTimer = null;
  const NO_DATE_SECONDS = 20;
  function showDateResult(info) {
    foundDate = info;
    const lbl = document.querySelector("#fzDateFound .fz-found-txt small");
    if (info.type === "entry") {
      lbl.textContent = "No se encontró fecha impresa";
      $("fzDateValue").textContent = "Entrada: hoy";
      $("fzDateDays").textContent = "Usar antes del " + fmtDate(addDays(info.date, ENTRY_DAYS));
    } else {
      lbl.textContent = (FreezerDate.TYPE_LABEL[info.type] || "Fecha") + " · fecha leída";
      $("fzDateValue").textContent = fmtDate(info.date);
      $("fzDateDays").textContent = daysText(daysLeft(info.date));
    }
    $("fzDateFound").classList.remove("hidden");
    $("fzDateMsg").textContent = "";
  }
  function armNoDate() {
    clearTimeout(noDateTimer);
    noDateTimer = setTimeout(() => {
      if (!dateOpen || foundDate) return;
      dateReader.pause(true);
      showDateResult({ date: todayISO(), type: "entry" });
    }, NO_DATE_SECONDS * 1000);
  }
  function openDateScanner(product) {
    return new Promise(async resolve => {
      dateResolve = resolve; dateOpen = true; foundDate = null;
      const pr = $("fzDateProduct"); pr.replaceChildren();
      const e = document.createElement("span"); e.textContent = product.emoji || "🧊";
      const n = document.createElement("span"); n.textContent = product.name;
      pr.append(e, n);
      $("fzDateFound").classList.add("hidden");
      $("fzTorch").classList.add("hidden"); $("fzTorch").setAttribute("aria-pressed", "false");
      $("fzDateMsg").textContent = "Abriendo cámara…";
      $("fzDateScanner").classList.remove("hidden");
      try {
        await dateReader.start((info) => {
          clearTimeout(noDateTimer);
          beep(); if (navigator.vibrate) navigator.vibrate(40);
          showDateResult(info);
        }, status => {
          if (status === "loading") $("fzDateMsg").textContent = "Preparando el lector de fechas…";
          else { $("fzDateMsg").textContent = "Apunta a la fecha impresa (Freeze By, Sell By, Use By, Best By)"; armNoDate(); }
        }, text => {
          // Muestra lo que está viendo para ayudar a apuntar.
          if (foundDate) return;
          const t = text.replace(/\s+/g, " ").trim().slice(0, 42);
          if (t.length >= 3) $("fzDateMsg").textContent = "Leyendo: " + t;
        });
        if (dateReader.hasTorch()) $("fzTorch").classList.remove("hidden");
      } catch (e) {
        const msg = e && e.name && e.name !== "Error" ? camError(e) : "No se pudo preparar el lector de fechas.";
        $("fzDateMsg").textContent = msg + " Toma una foto o escribe la fecha.";
        armNoDate();
      }
    });
  }
  function closeDateScanner(result) {
    if (!dateOpen) return;
    dateOpen = false; dateReader.stop(); clearTimeout(noDateTimer);
    $("fzDateScanner").classList.add("hidden");
    const r = dateResolve; dateResolve = null; if (r) r(result || null);
  }
  $("fzCloseDate").onclick = () => closeDateScanner(null);
  $("fzDateRetry").onclick = () => { foundDate = null; $("fzDateFound").classList.add("hidden"); $("fzDateMsg").textContent = "Leyendo…"; dateReader.pause(false); armNoDate(); };
  $("fzDateUse").onclick = () => { if (foundDate) closeDateScanner(foundDate); };
  $("fzTorch").onclick = async () => {
    const on = $("fzTorch").getAttribute("aria-pressed") !== "true";
    if (await dateReader.setTorch(on)) $("fzTorch").setAttribute("aria-pressed", String(on));
  };
  async function typeDate(defaultDate) {
    return ask({
      title: "Escribir fecha", text: "Elige la fecha impresa en el empaque, o cuánto tiempo lo quieres guardar.",
      type: "date", value: defaultDate || addMonths(3), quick: true, ok: "Guardar",
    });
  }
  $("fzDateType").onclick = async () => {
    dateReader.pause(true); clearTimeout(noDateTimer);
    const d = await typeDate(foundDate && foundDate.type !== "entry" ? foundDate.date : null);
    if (d) closeDateScanner({ date: d, type: "date" });
    else if (!foundDate) { dateReader.pause(false); armNoDate(); }
  };
  $("fzDatePhotoIn").addEventListener("click", () => { dateReader.pause(true); clearTimeout(noDateTimer); });
  $("fzDatePhotoIn").onchange = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) { if (!foundDate) { dateReader.pause(false); armNoDate(); } return; }
    $("fzDateFound").classList.add("hidden");
    $("fzDateMsg").textContent = "Leyendo la fecha en la foto…";
    let info = null;
    try { info = await FreezerDateReader.readPhoto(file); } catch {}
    if (!dateOpen) return;
    if (info) { beep(); showDateResult(info); return; }
    // Sin fecha en la foto: se usa hoy como entrada al freezer.
    showDateResult({ date: todayISO(), type: "entry" });
    await restartIfEnded(dateReader, () => dateReader.start(i => { clearTimeout(noDateTimer); beep(); showDateResult(i); }));
    dateReader.pause(true);
  };

  /* ---------- flujo completo ---------- */
  async function startFlow(product) {
    if (!product) product = await openProductScanner();
    if (!product) return;
    const info = await openDateScanner(product);
    if (!info) { toast("No se guardó " + product.name); return; }
    addItem(product, info);
  }
  $("fzScanBtn").onclick = () => startFlow();
  $("fzNoCode").onclick = async () => {
    const name = await ask({ title: "Nombre del producto", text: "Por ejemplo: carne molida, tamales, pan.", placeholder: "Ej. Carne molida", ok: "Continuar" });
    if (name) startFlow({ name, emoji: Products.emojiFor([], name) });
  };

  /* ---------- abrir y cerrar la sección ---------- */
  function openView() {
    $("freezerView").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    render(); updateBell();
  }
  function closeView() {
    closeProductScanner(null); closeDateScanner(null);
    $("freezerView").classList.add("hidden");
    document.body.style.overflow = "";
  }
  $("freezerBtn").onclick = openView;
  $("fzBack").onclick = closeView;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { closeProductScanner(null); closeDateScanner(null); }
    else { render(); localCheck(); }
  });

  /* ---------- avisos 3 días antes ---------- */
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  function pushInfo() { try { return JSON.parse(localStorage.getItem(PUSH_KEY)); } catch { return null; } }
  function setPushInfo(v) { try { v ? localStorage.setItem(PUSH_KEY, JSON.stringify(v)) : localStorage.removeItem(PUSH_KEY); } catch {} }
  const notifOn = () => "Notification" in window && Notification.permission === "granted" && !!pushInfo();
  function updateBell() {
    const on = notifOn();
    $("fzBell").setAttribute("aria-pressed", String(on));
    $("fzBellTxt").textContent = on ? "Avisos activos" : "Activar avisos";
  }
  function b64ToBytes(b64) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const s = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(s, c => c.charCodeAt(0));
  }
  async function subscribe(force) {
    const reg = await navigator.serviceWorker.ready;
    const r = await fetch("/api/push-key", { cache: "no-store" });
    if (!r.ok) throw new Error("no-server");
    const { publicKey } = await r.json();
    let sub = await reg.pushManager.getSubscription();
    if (sub && force) { await sub.unsubscribe().catch(() => {}); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(publicKey) });
    setPushInfo({ mode: "push", publicKey, endpoint: sub.endpoint });
    return sub;
  }
  let syncTimer = null;
  function syncSoon() { clearTimeout(syncTimer); syncTimer = setTimeout(sync, 800); }
  async function sync(retried) {
    const info = pushInfo();
    if (!info || info.mode !== "push" || !("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await subscribe();
      const r = await fetch("/api/freezer-sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
          items: items.map(i => ({ id: i.id, name: i.name, date: dueOf(i) })),
        }),
      });
      if (!r.ok) return;
      const data = await r.json().catch(() => ({}));
      if (data.publicKey && data.publicKey !== info.publicKey && !retried) { await subscribe(true); return sync(true); }
    } catch {}
  }
  $("fzBell").onclick = async () => {
    if (notifOn()) {
      toast("Los avisos están activos. Para apagarlos, usa los ajustes de notificaciones del teléfono.");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      if (isIOS && !standalone) {
        await ask({ title: "Instala la app primero", text: "En iPhone los avisos solo funcionan con la app instalada: en Safari toca Compartir → Agregar a inicio, y ábrela desde el ícono.", noInput: true, ok: "Entendido" });
      } else toast("Este navegador no permite avisos.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { toast("Sin permiso no se pueden enviar avisos. Actívalo en los ajustes del teléfono."); updateBell(); return; }
    try {
      if (!("PushManager" in window)) throw new Error("no-push");
      await subscribe();
      await sync();
      toast("Listo: te avisaremos 3 días antes de cada fecha.");
    } catch (e) {
      setPushInfo({ mode: "local" });
      toast("Avisos activados: se revisan cada vez que abres la app.");
    }
    updateBell(); localCheck();
  };

  // Revisión en el teléfono: si no hay avisos desde el servidor, se avisa al abrir la app.
  async function localCheck() {
    render();
    const info = pushInfo();
    if (!info || info.mode === "push") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    let done = {}; try { done = JSON.parse(localStorage.getItem(LOCAL_NOTIFIED)) || {}; } catch {}
    const due = items.filter(i => daysLeft(dueOf(i)) <= WARN_DAYS && !done[i.id + "|" + dueOf(i)]);
    if (!due.length) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification("❄️ Freezer: úsalo pronto", {
        body: due.map(i => i.name + " — " + daysText(daysLeft(dueOf(i))).toLowerCase()).join("\n"),
        icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "freezer", data: { url: "./?freezer=1" },
      });
      due.forEach(i => { done[i.id + "|" + dueOf(i)] = 1; });
      localStorage.setItem(LOCAL_NOTIFIED, JSON.stringify(done));
    } catch {}
  }

  /* ---------- inicio ---------- */
  items = load();
  render(); updateBell();
  if (new URLSearchParams(location.search).get("freezer") === "1") openView();
  localCheck();
  if (pushInfo() && pushInfo().mode === "push") syncSoon();
  // Actualiza los días al cambiar de fecha con la app abierta.
  setInterval(render, 60 * 60 * 1000);
})();
