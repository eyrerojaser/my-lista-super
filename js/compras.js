/* Mis Compras: calendario de visitas al súper, con gasto y foto del recibo.
   Página aparte; no toca Mi lista ni Freezer Scan.
   Los registros se guardan en el teléfono (localStorage) y las fotos en IndexedDB. */
(function () {
  const KEY = "purchases-v1";
  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const fmt = cents => money.format((cents || 0) / 100);
  const pad = n => String(n).padStart(2, "0");
  const isoOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const todayISO = () => isoOf(new Date());
  const parseISO = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const uid = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  let records = [];
  const now = new Date();
  let viewY = now.getFullYear(), viewM = now.getMonth(); // mes que se ve
  let selected = todayISO();

  /* ---------- guardado ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { toast("No se pudo guardar. Revisa el espacio del teléfono."); } }

  // Fotos: IndexedDB (aguanta imágenes; localStorage no).
  let dbP = null;
  function db() {
    if (!dbP) dbP = new Promise((res, rej) => {
      const r = indexedDB.open("mis-compras", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("photos");
      r.onsuccess = () => res(r.result);
      r.onerror = () => { dbP = null; rej(r.error); };
    });
    return dbP;
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const tx = d.transaction("photos", mode), st = tx.objectStore("photos");
      const req = fn(st);
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  }
  const putPhoto = (id, blob) => idb("readwrite", st => st.put(blob, id));
  const getPhoto = id => idb("readonly", st => st.get(id));
  const delPhoto = id => idb("readwrite", st => st.delete(id)).catch(() => {});

  const urls = new Map(); // id -> object URL de la foto
  async function photoURL(id) {
    if (urls.has(id)) return urls.get(id);
    try {
      const blob = await getPhoto(id);
      if (!blob) return null;
      const u = URL.createObjectURL(blob); urls.set(id, u); return u;
    } catch { return null; }
  }
  function dropURL(id) { if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); } }

  // Reduce la foto para que no ocupe tanto (el recibo se sigue leyendo bien).
  async function shrink(file) {
    let img;
    try { img = await createImageBitmap(file); }
    catch {
      img = await new Promise((res, rej) => { const u = URL.createObjectURL(file), i = new Image();
        i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error("img")); }; i.src = u; });
    }
    const max = 1800, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(b => res(b || file), "image/jpeg", 0.78));
  }

  /* ---------- cálculos ---------- */
  const monthKey = (y, m) => y + "-" + pad(m + 1);
  const inMonth = (y, m) => records.filter(r => r.date.startsWith(monthKey(y, m)));
  const sum = list => list.reduce((n, r) => n + (r.cents || 0), 0);
  function monthName(y, m) { return cap(new Date(y, m, 1).toLocaleDateString("es", { month: "long", year: "numeric" }).replace(" de ", " ")); }
  function dayTitle(iso) { return cap(parseISO(iso).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })); }
  function shortDate(iso) { return cap(parseISO(iso).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "")); }

  /* ---------- pantalla ---------- */
  function updateLink() {
    const n = new Date(), list = inMonth(n.getFullYear(), n.getMonth());
    $("pcLinkAmt").textContent = list.length ? fmt(sum(list)) : "";
    $("pcLinkSub").textContent = list.length
      ? "Este mes: " + (list.length === 1 ? "1 compra" : list.length + " compras")
      : "Registra lo que gastas en el súper";
  }

  function render() {
    const list = inMonth(viewY, viewM);
    $("pcMonth").textContent = monthName(viewY, viewM);
    $("pcTotal").textContent = fmt(sum(list));
    $("pcVisits").textContent = list.length ? (list.length === 1 ? "1 compra registrada" : list.length + " compras registradas") : "Sin compras este mes";

    // calendario
    const first = new Date(viewY, viewM, 1).getDay(); // domingo = 0
    const days = new Date(viewY, viewM + 1, 0).getDate();
    const byDay = {};
    list.forEach(r => { byDay[r.date] = (byDay[r.date] || 0) + r.cents; });
    const cells = [];
    for (let i = 0; i < first; i++) { const b = document.createElement("span"); b.className = "pc-cell blank"; cells.push(b); }
    const today = todayISO();
    for (let d = 1; d <= days; d++) {
      const iso = viewY + "-" + pad(viewM + 1) + "-" + pad(d);
      const c = document.createElement("button"); c.type = "button";
      c.className = "pc-cell" + (byDay[iso] ? " has" : "") + (iso === today ? " today" : "") + (iso === selected ? " sel" : "");
      const n = document.createElement("span"); n.className = "pc-num"; n.textContent = d;
      c.append(n);
      if (byDay[iso]) {
        const a = document.createElement("span"); a.className = "pc-amt";
        a.textContent = "$" + Math.round(byDay[iso] / 100).toLocaleString("en-US");
        c.append(a);
      }
      c.setAttribute("aria-label", dayTitle(iso) + (byDay[iso] ? ", gastaste " + fmt(byDay[iso]) : ""));
      c.setAttribute("aria-pressed", String(iso === selected));
      c.onclick = () => { selected = iso; render(); };
      cells.push(c);
    }
    $("pcGrid").replaceChildren(...cells);

    // día seleccionado
    $("pcDayTitle").textContent = dayTitle(selected);
    const dayList = records.filter(r => r.date === selected).sort((a, b) => a.created - b.created);
    $("pcDayList").replaceChildren(...dayList.map(r => recRow(r, false)));
    $("pcDayEmpty").classList.toggle("hidden", dayList.length > 0);

    // compras del mes
    const ordered = list.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created));
    $("pcMonthList").replaceChildren(...ordered.map(r => recRow(r, true)));
    $("pcMonthEmpty").classList.toggle("hidden", ordered.length > 0);
    $("pcCount").textContent = ordered.length ? fmt(sum(list)) : "";
    updateLink();
  }

  function recRow(r, withDate) {
    const li = document.createElement("li"); li.className = "pc-rec";
    const th = document.createElement("button"); th.type = "button"; th.className = "pc-thumb";
    th.textContent = "🧾";
    if (r.photo) {
      th.setAttribute("aria-label", "Ver foto del recibo");
      photoURL(r.id).then(u => { if (u) { const im = document.createElement("img"); im.src = u; im.alt = ""; th.replaceChildren(im); } });
      th.onclick = () => openViewer(r.id);
    } else { th.setAttribute("aria-label", "Agregar foto del recibo"); th.onclick = () => openSheet(r); }
    const info = document.createElement("div"); info.className = "pc-rec-info";
    const b = document.createElement("b"); b.textContent = fmt(r.cents);
    const s = document.createElement("small");
    s.textContent = [withDate ? shortDate(r.date) : "", r.store || "", r.photo ? "" : "Sin foto"].filter(Boolean).join(" · ") || "Compra";
    info.append(b, s);
    if (withDate) { info.style.cursor = "pointer"; info.onclick = () => { selected = r.date; render(); $("pcDayTitle").scrollIntoView({ behavior: "smooth", block: "center" }); }; }
    const ed = document.createElement("button"); ed.type = "button"; ed.className = "pc-icon"; ed.setAttribute("aria-label", "Editar compra de " + fmt(r.cents));
    ed.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    ed.onclick = () => openSheet(r);
    const del = document.createElement("button"); del.type = "button"; del.className = "pc-icon del"; del.setAttribute("aria-label", "Borrar compra de " + fmt(r.cents));
    del.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';
    del.onclick = () => removeRecord(r.id);
    li.append(th, info, ed, del);
    return li;
  }

  /* ---------- borrar (con deshacer) ---------- */
  const pendingDelete = new Map(); // id -> timer para borrar la foto
  function removeRecord(id) {
    const idx = records.findIndex(r => r.id === id); if (idx < 0) return;
    const [r] = records.splice(idx, 1);
    save(); render();
    // La foto se borra de verdad cuando ya no se puede deshacer.
    const t = setTimeout(() => { pendingDelete.delete(id); if (r.photo) { delPhoto(id); dropURL(id); } }, 6000);
    pendingDelete.set(id, t);
    toast("Borraste la compra de " + fmt(r.cents), () => {
      clearTimeout(pendingDelete.get(id)); pendingDelete.delete(id);
      records.push(r); save(); render();
    });
  }

  /* ---------- registrar / editar ---------- */
  let editing = null;            // registro que se edita (o null si es nuevo)
  let draftPhoto = undefined;    // Blob nuevo, null = quitar foto, undefined = sin cambios
  let draftURL = null;

  function setPreview(url) {
    const box = $("pcPhotoPrev");
    if (url) { const im = document.createElement("img"); im.src = url; im.alt = "Foto del recibo"; box.replaceChildren(im); }
    else box.replaceChildren(Object.assign(document.createElement("span"), { textContent: "🧾" }));
    $("pcPhotoLabel").textContent = url ? "Cambiar foto" : "Subir foto del recibo";
    $("pcPhotoRemove").classList.toggle("hidden", !url);
  }
  async function openSheet(rec) {
    editing = rec || null; draftPhoto = undefined;
    if (draftURL) { URL.revokeObjectURL(draftURL); draftURL = null; }
    $("pcSheetTitle").textContent = rec ? "Editar compra" : "Registrar compra";
    $("pcDate").value = rec ? rec.date : selected;
    $("pcDate").max = todayISO();
    $("pcAmount").value = rec ? (rec.cents / 100).toFixed(2) : "";
    $("pcStore").value = rec ? rec.store || "" : "";
    $("pcError").classList.add("hidden");
    $("pcDelete").classList.toggle("hidden", !rec);
    setPreview(rec && rec.photo ? await photoURL(rec.id) : null);
    $("pcSheet").classList.remove("hidden");
    if (!rec) setTimeout(() => $("pcAmount").focus(), 80);
  }
  function closeSheet() {
    $("pcSheet").classList.add("hidden");
    if (draftURL) { URL.revokeObjectURL(draftURL); draftURL = null; }
    editing = null; draftPhoto = undefined;
  }
  function parseAmount(v) {
    v = String(v || "").replace(/[$\s]/g, "");
    if (!v) return null;
    if (v.includes(",") && !v.includes(".")) v = v.replace(",", ".");
    else v = v.replace(/,/g, "");
    if (!/^\d+(\.\d{0,2})?$/.test(v)) return null;
    const cents = Math.round(parseFloat(v) * 100);
    return cents > 0 && cents < 10000000 ? cents : null;
  }

  $("pcPhotoIn").onchange = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    $("pcPhotoLabel").textContent = "Preparando foto…";
    try {
      draftPhoto = await shrink(file);
      if (draftURL) URL.revokeObjectURL(draftURL);
      draftURL = URL.createObjectURL(draftPhoto);
      setPreview(draftURL);
    } catch { setPreview(null); toast("No se pudo abrir esa foto. Prueba con otra."); }
  };
  $("pcPhotoRemove").onclick = () => { draftPhoto = null; setPreview(null); };
  $("pcCancel").onclick = closeSheet;
  $("pcDelete").onclick = () => { const id = editing && editing.id; closeSheet(); if (id) removeRecord(id); };

  $("pcForm").onsubmit = async e => {
    e.preventDefault();
    const cents = parseAmount($("pcAmount").value);
    const date = $("pcDate").value;
    if (!cents) { $("pcError").classList.remove("hidden"); $("pcAmount").focus(); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { $("pcDate").focus(); return; }
    const isNew = !editing;
    const r = editing || { id: uid(), created: Date.now(), photo: false };
    Object.assign(r, { date, cents, store: $("pcStore").value.trim().slice(0, 40) });
    try {
      if (draftPhoto instanceof Blob) { await putPhoto(r.id, draftPhoto); dropURL(r.id); r.photo = true; }
      else if (draftPhoto === null && r.photo) { await delPhoto(r.id); dropURL(r.id); r.photo = false; }
    } catch { toast("La compra se guardó, pero la foto no. Intenta de nuevo."); }
    if (isNew) records.push(r);
    save();
    // Muestra el mes y el día de la compra guardada.
    selected = date; const d = parseISO(date); viewY = d.getFullYear(); viewM = d.getMonth();
    closeSheet(); render();
    toast(isNew ? "Compra registrada: " + fmt(cents) : "Cambios guardados");
  };
  $("pcAdd").onclick = () => openSheet(null);

  /* ---------- ver foto ---------- */
  async function openViewer(id) {
    const u = await photoURL(id); if (!u) { toast("No se encontró la foto."); return; }
    $("pcViewerImg").src = u; $("pcViewer").classList.remove("hidden");
  }
  $("pcViewerClose").onclick = () => $("pcViewer").classList.add("hidden");
  $("pcViewer").onclick = e => { if (e.target === $("pcViewer")) $("pcViewer").classList.add("hidden"); };

  /* ---------- meses ---------- */
  function shiftMonth(delta) {
    const d = new Date(viewY, viewM + delta, 1);
    viewY = d.getFullYear(); viewM = d.getMonth();
    const t = new Date();
    selected = (viewY === t.getFullYear() && viewM === t.getMonth()) ? todayISO() : monthKey(viewY, viewM) + "-01";
    render();
  }
  $("pcPrev").onclick = () => shiftMonth(-1);
  $("pcNext").onclick = () => shiftMonth(1);

  /* ---------- descargar resumen mensual ---------- */
  function csvCell(v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  $("pcDownload").onclick = async () => {
    const list = inMonth(viewY, viewM).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.created - b.created));
    if (!list.length) { toast("No hay compras registradas en " + monthName(viewY, viewM) + "."); return; }
    const rows = [
      ["Mis Compras - " + monthName(viewY, viewM)],
      [],
      ["Fecha", "Día", "Tienda", "Gasto (USD)", "Foto del recibo"],
      ...list.map(r => [r.date, parseISO(r.date).toLocaleDateString("es", { weekday: "long" }), r.store || "", (r.cents / 100).toFixed(2), r.photo ? "Sí" : "No"]),
      [],
      ["TOTAL DEL MES", "", "", (sum(list) / 100).toFixed(2), ""],
      ["Número de compras", "", "", String(list.length), ""],
    ];
    const text = rows.map(r => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
    const name = "mis-compras-" + monthKey(viewY, viewM) + ".csv";
    const blob = new Blob(["\ufeff" + text], { type: "text/csv;charset=utf-8" });
    // En iPhone se usa el menú de compartir, que tiene "Guardar en Archivos".
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios && navigator.canShare) {
      try {
        const file = new File([blob], name, { type: "text/csv" });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Resumen " + monthName(viewY, viewM) }); return; }
      } catch (err) { if (err && err.name === "AbortError") return; }
    }
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; a.rel = "noopener";
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
    toast("Resumen guardado en Descargas");
  };

  /* ---------- aviso ---------- */
  let toastTimer = null;
  function toast(msg, undo) {
    $("pcToastTxt").textContent = msg;
    const b = $("pcToastUndo"); b.classList.toggle("hidden", !undo);
    b.onclick = () => { if (undo) undo(); $("pcToast").classList.add("hidden"); };
    $("pcToast").classList.remove("hidden");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $("pcToast").classList.add("hidden"), 5500);
  }

  /* ---------- abrir / cerrar ---------- */
  function openView() {
    const t = new Date(); viewY = t.getFullYear(); viewM = t.getMonth(); selected = todayISO();
    render();
    $("comprasView").classList.remove("hidden");
    $("comprasView").scrollTop = 0;
    document.body.style.overflow = "hidden";
  }
  function closeView() {
    closeSheet(); $("pcViewer").classList.add("hidden");
    $("comprasView").classList.add("hidden");
    document.body.style.overflow = "";
    updateLink();
  }
  $("comprasBtn").onclick = openView;
  $("pcBack").onclick = closeView;
  document.addEventListener("visibilitychange", () => { if (!document.hidden) updateLink(); });

  records = load();
  updateLink();
  if (new URLSearchParams(location.search).get("compras") === "1") openView();
})();
