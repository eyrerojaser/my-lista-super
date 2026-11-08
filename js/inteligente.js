/* Funciones inteligentes de NoPencil
   1. "Te toca comprar": aprende cada cuánto compras cada cosa y te la sugiere cuando ya toca.
   2. Comparar precios: busca un producto en tus recibos escaneados y te dice dónde salió más barato.
   3. Con IA (si está activada en el servidor):
      · Pasar mi lista de papel: foto de la lista escrita a mano → productos en tu lista.
      · ¿Qué cocino?: recetas con lo que tienes en Freezer, Refri y Despensa (primero lo que vence). */
(function () {
  const $ = id => document.getElementById(id);
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();
  const T = s => (window.I18N && I18N.t ? I18N.t(s) : s);
  const en = () => window.I18N && I18N.lang() === "en";
  const toast = (m, u) => window.MiLista && MiLista.toast(m, u);
  const DAY = 864e5;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };

  /* ================= 1. Te toca comprar ================= */
  const HKEY = "buy-history-v1";
  let hist = readJSON(HKEY, {});
  const saveHist = () => { try { localStorage.setItem(HKEY, JSON.stringify(hist)); } catch {} };

  function bought(it) {
    const k = norm(it.name); if (!k) return;
    const h = hist[k] || (hist[k] = { n: it.name, e: it.emoji || "", c: it.cat || "", t: [] });
    h.n = it.name; if (it.emoji) h.e = it.emoji; if (it.cat) h.c = it.cat;
    const now = Date.now(), last = h.t[h.t.length - 1] || 0;
    if (now - last < 12 * 3600e3) return; // la misma compra (marcar y desmarcar)
    h.t.push(now); if (h.t.length > 12) h.t = h.t.slice(-12);
    delete h.s;
    saveHist();
  }
  // Cada cuántos días se compra (mediana de los intervalos).
  function cycle(h) {
    if (!h.t || h.t.length < 2) return 0;
    const gaps = [];
    for (let i = 1; i < h.t.length; i++) gaps.push((h.t[i] - h.t[i - 1]) / DAY);
    gaps.sort((a, b) => a - b);
    const mid = gaps[Math.floor(gaps.length / 2)];
    return Math.max(2, Math.min(90, mid));
  }
  function suggestions() {
    hist = readJSON(HKEY, hist);
    const pending = new Set((window.MiLista ? MiLista.getItems() : []).filter(i => !i.done).map(i => norm(i.name)));
    const now = Date.now(), out = [];
    for (const k in hist) {
      const h = hist[k], c = cycle(h);
      if (!c || pending.has(k) || pending.has(norm(h.n)) || (h.s && h.s > now)) continue;
      const since = (now - h.t[h.t.length - 1]) / DAY;
      if (since >= c * 0.9 && since < c * 4) out.push({ k, h, ratio: since / c, c });
    }
    return out.sort((a, b) => b.ratio - a.ratio).slice(0, 6);
  }
  function renderCard() {
    const card = $("smartCard"); if (!card) return;
    const list = suggestions();
    card.classList.toggle("hidden", !list.length);
    if (!list.length) { card.replaceChildren(); return; }
    const head = el("div", "smart-head");
    head.append(el("span", "smart-ico", "💡"), el("b", "", "Te toca comprar"), el("small", "", "Según cada cuánto lo compras"));
    const chips = el("div", "smart-chips");
    list.forEach(({ k, h, c }) => {
      const chip = el("div", "smart-chip");
      const add = el("button", "smart-add"); add.type = "button";
      const em = el("span", "smart-em", h.e || "🛒"); em.setAttribute("aria-hidden", "true");
      const nm = el("span", "smart-name", h.n);
      add.append(em, nm, el("span", "smart-plus", "+"));
      add.setAttribute("aria-label", T("Agregar") + " " + h.n);
      add.onclick = () => { if (window.MiLista) MiLista.add({ name: h.n, emoji: h.e, cat: h.c }); toast(h.n + " → " + T("Mi lista")); };
      const x = el("button", "smart-x", "✕"); x.type = "button";
      x.setAttribute("aria-label", T("Ahora no"));
      x.onclick = () => { h.s = Date.now() + Math.max(2, c * 0.5) * DAY; saveHist(); renderCard(); };
      chip.append(add, x);
      chips.append(chip);
    });
    card.replaceChildren(head, chips);
  }
  window.Habitos = { bought, render: renderCard, suggestions };

  /* ================= hoja (ventana de abajo) ================= */
  const sheet = $("smartSheet"), body = $("smartBody");
  function openSheet(...nodes) { body.replaceChildren(...nodes); sheet.classList.remove("hidden"); }
  function closeSheet() { sheet.classList.add("hidden"); body.replaceChildren(); }
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !sheet.classList.contains("hidden")) closeSheet(); });
  const title = t => { const h = el("h2", "", t); h.id = "smartTitle"; return h; };
  function actions(...btns) { const a = el("div", "sheet-actions"); a.append(...btns); return a; }
  function btn(label, cls, fn) { const b = el("button", cls, label); b.type = "button"; b.onclick = fn; return b; }
  function loading(t, sub) {
    const box = el("div", "smart-loading");
    box.append(el("span", "smart-spin"), el("b", "", t), el("small", "", sub || ""));
    openSheet(box);
  }

  /* ================= 2. Comparar precios ================= */
  // Palabras en español → como suelen salir en los recibos en inglés (abreviadas).
  const SYN = {
    leche: ["milk", "mlk"], huevo: ["egg", "eggs"], huevos: ["egg", "eggs"], pan: ["bread", "brd"], pollo: ["chicken", "chkn", "chk"],
    carne: ["beef", "bf"], molida: ["ground", "grnd"], res: ["beef"], puerco: ["pork"], queso: ["cheese", "chs"], mantequilla: ["butter", "btr"],
    arroz: ["rice"], frijol: ["bean", "beans"], frijoles: ["bean", "beans"], platano: ["banana", "bnna"], platanos: ["banana", "bananas"],
    manzana: ["apple", "apples"], aguacate: ["avocado", "avoc", "avo"], tomate: ["tomato", "tom"], cebolla: ["onion"], papa: ["potato", "pot"],
    papas: ["potato", "potatoes", "chips"], azucar: ["sugar"], harina: ["flour"], aceite: ["oil"], cafe: ["coffee"], agua: ["water"],
    jugo: ["juice"], refresco: ["soda", "coke"], yogur: ["yogurt", "ygrt"], tortillas: ["tortilla", "tort"], tortilla: ["tortilla", "tort"],
    cereal: ["cereal"], papel: ["paper"], jabon: ["soap", "detergent"], pañales: ["diaper", "diapers"], panales: ["diaper", "diapers"],
    helado: ["ice cream", "icecream"], pescado: ["fish"], camaron: ["shrimp"], fresas: ["strawberry", "strawberries", "strwb"],
    uvas: ["grape", "grapes"], limon: ["lime", "lemon"], limones: ["lime", "limes", "lemon"], zanahoria: ["carrot", "carrots"],
  };
  function terms(q) {
    return norm(q).split(" ").filter(w => w.length >= 2).map(w => [w].concat(SYN[w] || []));
  }
  function searchPrices(q) {
    const groups = terms(q); if (!groups.length) return [];
    const recs = readJSON("purchases-v1", []);
    const out = [];
    for (const r of recs) {
      for (const it of (Array.isArray(r.items) ? r.items : [])) {
        if (it.cents == null || it.cents <= 0) continue;
        const n = norm(it.name);
        if (groups.every(g => g.some(w => n.includes(w)))) out.push({ name: it.name, cents: it.cents, store: r.store || "—", date: r.date || "" });
      }
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }
  const money = c => (c / 100).toLocaleString(en() ? "en-US" : "es-US", { style: "currency", currency: "USD" });
  const shortDate = iso => { if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(window.I18N ? I18N.loc() : "es-US", { day: "numeric", month: "short" }); };
  function openPrices() {
    const recs = readJSON("purchases-v1", []);
    const withItems = recs.filter(r => Array.isArray(r.items) && r.items.some(i => i.cents > 0)).length;
    const f = el("form", "price-form"); f.autocomplete = "off";
    const inp = el("input"); inp.type = "search"; inp.placeholder = T("Ej. leche, huevos, pollo"); inp.setAttribute("aria-label", T("Producto a buscar")); inp.enterKeyHint = "search";
    f.append(inp);
    const res = el("div", "price-res");
    const intro = el("p", "", withItems ? "Escribe un producto y te muestro lo que pagaste en cada tienda." : "Todavía no hay recibos escaneados con productos. En Mis Compras toca Escanear recibo y aquí verás tus precios.");
    function run() {
      const q = inp.value.trim();
      if (!q) { res.replaceChildren(); return; }
      const rows = searchPrices(q);
      if (!rows.length) { res.replaceChildren(el("p", "price-none", withItems ? "No encontré ese producto en tus recibos. Prueba con otra palabra (en inglés también, como salen en el recibo)." : "Escanea tus recibos para comparar precios.")); return; }
      // El más barato por tienda
      const best = {};
      rows.forEach(r => { if (!best[r.store] || r.cents < best[r.store].cents) best[r.store] = r; });
      const stores = Object.values(best).sort((a, b) => a.cents - b.cents);
      const top = stores[0];
      const win = el("div", "price-win");
      win.append(el("span", "price-win-ico", "🏆"));
      const wt = el("div", "price-win-txt");
      wt.append(el("b", "", (stores.length > 1 ? T("Más barato en") + " " : T("Mejor precio:") + " ") + top.store), el("small", "", money(top.cents) + " · " + top.name + " · " + shortDate(top.date)));
      win.append(wt);
      const parts = [win];
      if (stores.length > 1) {
        const diff = stores[stores.length - 1].cents - top.cents;
        if (diff > 0) parts.push(el("p", "price-save", T("Ahorras hasta") + " " + money(diff) + " " + T("comprándolo ahí")));
      }
      const ul = el("ul", "price-list");
      rows.slice(0, 30).forEach(r => {
        const li = el("li", r === top ? "best" : "");
        const a = el("div", "price-l"); a.append(el("b", "", r.store), el("small", "", r.name + " · " + shortDate(r.date)));
        li.append(a, el("span", "price-c", money(r.cents)));
        ul.append(li);
      });
      parts.push(ul);
      res.replaceChildren(...parts);
    }
    inp.addEventListener("input", run);
    f.onsubmit = e => { e.preventDefault(); inp.blur(); run(); };
    openSheet(title("Comparar precios"), intro, f, res, actions(btn("Cerrar", "ghost", closeSheet)));
    setTimeout(() => inp.focus(), 80);
  }
  $("priceBtn").onclick = openPrices;

  /* ================= 3. IA ================= */
  let aiOn = false;
  const token = () => window.MiCuenta && MiCuenta.token();
  async function checkAI() {
    if (!token()) { setAI(false); return; }
    try {
      const r = await fetch("/api/ai", { cache: "no-store" });
      const d = await r.json();
      setAI(!!d.on);
    } catch { setAI(false); }
  }
  function setAI(on) {
    aiOn = on;
    $("paperBtn").classList.add("hidden");
    renderMenu();
    $("cookBtn").classList.toggle("hidden", !on || !freezerItems().length);
  }
  async function ai(body) {
    const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ token: token(), lang: en() ? "en" : "es" }, body)) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 429) throw new Error("limit");
    if (!r.ok) throw new Error(d.error || "fail");
    return d;
  }
  function aiError(e) {
    const msg = e.message === "limit" ? "Llegaste al límite de hoy de funciones con IA. Mañana puedes usarlas otra vez."
      : !navigator.onLine ? "Sin conexión. Esta función necesita internet."
      : "No se pudo completar. Intenta de nuevo en un momento.";
    openSheet(title("Algo salió mal"), el("p", "", msg), actions(btn("Cerrar", "primary", closeSheet)));
  }

  // Foto → JPEG más liviano para enviarlo.
  function shrink(file, max) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("img")); };
      img.src = url;
    });
  }

  /* --- Pasar mi lista de papel --- */
  $("paperIn").onchange = async e => {
    const file = e.target.files && e.target.files[0]; e.target.value = "";
    if (!file) return;
    loading("Leyendo tu lista…", "Esto toma unos segundos");
    let items;
    try {
      const image = await shrink(file, 1600);
      items = (await ai({ action: "list", image })).items || [];
    } catch (err) { aiError(err); return; }
    if (!items.length) {
      openSheet(title("No encontré productos"), el("p", "", "Prueba con una foto más cerca y con buena luz, donde se vea toda la lista."), actions(btn("Cerrar", "primary", closeSheet)));
      return;
    }
    const ul = el("ul", "paper-list");
    const checks = items.map(it => {
      const li = el("li"), lab = el("label");
      const cb = el("input"); cb.type = "checkbox"; cb.checked = true;
      const nm = el("span", "paper-name", it.name);
      lab.append(cb, nm);
      if (it.qty > 1) lab.append(el("small", "", "×" + it.qty));
      li.append(lab); ul.append(li);
      return { cb, it };
    });
    const addBtn = btn("", "primary", () => {
      const sel = checks.filter(c => c.cb.checked).map(c => c.it);
      sel.forEach(it => { for (let i = 0; i < it.qty; i++) MiLista.add({ name: it.name }); });
      closeSheet();
      toast(sel.length === 1 ? T("Se agregó 1 producto") : T("Se agregaron") + " " + sel.length + " " + T("productos"));
    });
    const paint = () => { const n = checks.filter(c => c.cb.checked).length; addBtn.textContent = n === 1 ? T("Agregar 1 producto") : T("Agregar") + " " + n + " " + T("productos"); addBtn.disabled = !n; };
    checks.forEach(c => c.cb.addEventListener("change", paint)); paint();
    openSheet(title("Tu lista de papel"), el("p", "", "Revisa lo que encontré. Quita la marca de lo que no quieras agregar."), ul, actions(btn("Cancelar", "ghost", closeSheet), addBtn));
  };
  $("paperBtn").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("paperIn").click(); } });

  /* --- ¿Qué cocino? --- */
  const LOC_DAYS = { freezer: 90, refri: 7, despensa: 180 };
  function freezerItems() {
    const today = new Date(); const t0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    return readJSON("freezer-items-v1", []).map(i => {
      if (!i || !i.name) return null;
      let due = i.date;
      if (i.type === "entry" && i.date) { const [y, m, d] = i.date.split("-").map(Number); due = new Date(Date.UTC(y, m - 1, d) + (LOC_DAYS[i.loc] || 90) * DAY).toISOString().slice(0, 10); }
      let days = null;
      if (due) { const [y, m, d] = due.split("-").map(Number); days = Math.round((Date.UTC(y, m - 1, d) - t0) / DAY); }
      return { name: i.name, days, place: i.loc || "freezer" };
    }).filter(Boolean);
  }
  $("cookBtn").onclick = async () => {
    const items = freezerItems();
    if (!items.length) { toast(T("Agrega productos al Freezer, Refri o Despensa primero")); return; }
    loading("Buscando recetas…", "Con lo que tienes, empezando por lo que vence primero");
    let recipes;
    try { recipes = (await ai({ action: "recipes", items })).recipes || []; } catch (err) { aiError(err); return; }
    if (!recipes.length) { aiError(new Error("fail")); return; }
    const list = el("div", "recipe-list");
    recipes.forEach((r, i) => {
      const card = el("details", "recipe");
      if (i === 0) card.open = true;
      const sum = el("summary");
      const st = el("div", "recipe-st"); st.append(el("b", "", r.title), el("small", "", (r.time ? "⏱ " + r.time + " · " : "") + r.uses.join(", ")));
      sum.append(st);
      card.append(sum);
      if (r.extra && r.extra.length) card.append(el("p", "recipe-extra", T("También necesitas:") + " " + r.extra.join(", ")));
      const ol = el("ol", "recipe-steps"); r.steps.forEach(s => ol.append(el("li", "", s)));
      card.append(ol);
      list.append(card);
    });
    openSheet(title("Ideas para cocinar"), el("p", "", "Usan primero lo que está por vencer."), list, actions(btn("Cerrar", "primary", closeSheet)));
  };
  // Mostrar el botón de recetas al abrir el Freezer si hay productos.
  const fz = $("freezerBtn");
  if (fz) fz.addEventListener("click", () => setTimeout(() => setAI(aiOn), 50));

  /* ================= 4. Presupuesto del mes (Mis Compras) ================= */
  const BKEY = "budget-v1";
  const monthNow = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); };
  const spentThisMonth = () => readJSON("purchases-v1", []).filter(r => r && r.date && r.date.startsWith(monthNow())).reduce((n, r) => n + (r.cents || 0), 0);
  function renderBudget(checkAlert) {
    const box = $("pcBudget"); if (!box) return;
    const b = readJSON(BKEY, {});
    // Solo en el mes actual (el total de arriba cambia al ver otros meses).
    const viewingNow = (() => { const m = ($("pcMonth") || {}).textContent || ""; const d = new Date(); return !m || m.indexOf(String(d.getFullYear())) >= 0 && m.toLowerCase().indexOf(d.toLocaleDateString(window.I18N ? I18N.loc() : "es", { month: "long" }).toLowerCase()) >= 0; })();
    if (!viewingNow) { box.replaceChildren(); return; }
    const spent = spentThisMonth();
    if (!b.cents) {
      box.replaceChildren(btn("＋ Poner presupuesto del mes", "pc-budget-set", editBudget));
      return;
    }
    const pct = Math.round(spent / b.cents * 100);
    const bar = el("div", "pc-budget-bar" + (pct >= 100 ? " over" : pct >= 80 ? " warn" : ""));
    const fill = el("div"); fill.style.width = Math.min(100, pct) + "%"; bar.append(fill);
    const left = b.cents - spent;
    const txt = el("div", "pc-budget-txt");
    txt.append(el("span", "", T(left >= 0 ? "Te quedan " + money(left) + " de " + money(b.cents) : "Te pasaste por " + money(-left) + " · presupuesto " + money(b.cents))));
    const ed = btn("✎", "pc-budget-edit", editBudget); ed.setAttribute("aria-label", T("Cambiar presupuesto"));
    txt.append(ed);
    box.replaceChildren(bar, txt);
    if (checkAlert) {
      const level = pct >= 100 ? 100 : pct >= 80 ? 80 : 0, m = monthNow();
      b.warned = b.warned || {};
      if (level && (b.warned[m] || 0) < level) {
        b.warned[m] = level; try { localStorage.setItem(BKEY, JSON.stringify(b)); } catch {}
        toast(level === 100 ? T("⚠️ Ya pasaste tu presupuesto del mes") : T("⚠️ Ya usaste el 80% de tu presupuesto del mes"));
      }
    }
  }
  function editBudget() {
    const b = readJSON(BKEY, {});
    const f = el("form"); f.autocomplete = "off";
    const inp = el("input"); inp.type = "number"; inp.inputMode = "decimal"; inp.min = "0"; inp.step = "1"; inp.placeholder = "500";
    inp.setAttribute("aria-label", T("Presupuesto del mes en dólares"));
    if (b.cents) inp.value = String(Math.round(b.cents / 100));
    f.append(inp);
    const save = () => {
      const v = Math.round(parseFloat(String(inp.value).replace(",", ".")) * 100);
      const nb = readJSON(BKEY, {});
      if (!v || v <= 0) delete nb.cents; else nb.cents = v;
      nb.warned = {};
      try { localStorage.setItem(BKEY, JSON.stringify(nb)); } catch {}
      closeSheet(); renderBudget(true);
    };
    f.onsubmit = e => { e.preventDefault(); save(); };
    const acts = [btn("Cancelar", "ghost", closeSheet), btn("Guardar", "primary", save)];
    if (b.cents) acts.splice(1, 0, btn("Quitar", "ghost", () => { inp.value = ""; save(); }));
    openSheet(title("Presupuesto del mes"), el("p", "", "¿Cuánto quieres gastar en el súper este mes? Te aviso al llegar al 80% y si te pasas."), f, actions(...acts));
    setTimeout(() => inp.focus(), 80);
  }
  // Mis Compras vuelve a dibujar el total cada vez que cambia algo: ahí se actualiza el presupuesto.
  if ($("pcTotal")) new MutationObserver(() => renderBudget(true)).observe($("pcTotal"), { childList: true, characterData: true, subtree: true });

  /* ================= 5. Agregar con la voz ================= */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12,
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
  function parseSpoken(text) {
    return String(text || "").split(/,|;|\.|\s+(?:y|e|and|plus|también|tambien|luego|then)\s+/i)
      .map(p => p.trim()).filter(Boolean).map(p => {
        let qty = 1;
        const m = p.match(/^(\d{1,2}|[a-záéíóúñ]+)\s+(.+)$/i);
        if (m) { const w = m[1].toLowerCase(); const n = /^\d+$/.test(w) ? +w : NUM[w]; if (n) { qty = Math.min(20, n); p = m[2]; } }
        p = p.replace(/^(de|of)\s+/i, "").trim();
        return { name: p.charAt(0).toUpperCase() + p.slice(1), qty };
      }).filter(i => i.name.length >= 2).slice(0, 25);
  }
  window.Habitos.parseSpoken = parseSpoken;
  if (SR && $("addForm")) {
    const mic = el("button", "mic-btn"); mic.type = "button"; mic.setAttribute("aria-label", T("Agregar con la voz"));
    mic.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
    const sub = $("addForm").querySelector('button[type="submit"]');
    $("addForm").insertBefore(mic, sub);
    let rec = null;
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = en() ? "en-US" : "es-US"; rec.interimResults = false; rec.maxAlternatives = 1;
      mic.classList.add("on"); toast(T("Te escucho… di los productos, por ejemplo: leche, huevos y pan"));
      rec.onresult = e => {
        const said = Array.from(e.results).map(r => r[0].transcript).join(" ");
        const items = parseSpoken(said);
        items.forEach(it => { for (let i = 0; i < it.qty; i++) MiLista.add({ name: it.name }); });
        if (items.length) toast(T("Agregué:") + " " + items.map(i => (i.qty > 1 ? i.qty + " " : "") + i.name).join(", "));
        else toast(T("No te entendí. Intenta otra vez."));
      };
      rec.onerror = e => { if (e.error === "not-allowed" || e.error === "service-not-allowed") toast(T("Permite el micrófono para agregar con la voz.")); else if (e.error !== "aborted" && e.error !== "no-speech") toast(T("No te entendí. Intenta otra vez.")); };
      rec.onend = () => { mic.classList.remove("on"); rec = null; };
      try { rec.start(); } catch { mic.classList.remove("on"); rec = null; }
    };
  }

  /* ================= 6. Menú con todo, por categorías ================= */
  function openFreezerAt(loc) {
    $("freezerBtn").click();
    setTimeout(() => { const t = document.querySelector('.fz-locs [data-loc="' + loc + '"]'); if (t) t.click(); }, 60);
  }
  function openCompras(then) { $("comprasBtn").click(); if (then) setTimeout(then, 120); }
  function explainHabits() {
    const list = suggestions();
    if (list.length) { const c = $("smartCard"); c.scrollIntoView({ behavior: "smooth", block: "center" }); c.classList.add("flash"); setTimeout(() => c.classList.remove("flash"), 1200); return; }
    openSheet(title("Te toca comprar"), el("p", "", "NoPencil aprende cada cuánto compras cada cosa. Cuando ya te toca comprar algo otra vez (el café, las tortillas, la leche…), aparece arriba de tu lista para agregarlo con un toque."),
      el("p", "smart-note", "Para aprender, marca los productos como comprados (el círculo de la derecha) cuando los eches al carrito. Después de 2 compras de lo mismo empieza a avisarte."), actions(btn("Entendido", "primary", closeSheet)));
  }
  function startVoice() {
    $("typeIn").click();
    setTimeout(() => { const m = document.querySelector(".mic-btn"); if (m) m.click(); }, 350);
  }
  function menuGroups() {
    const amt = ($("pcLinkAmt") || {}).textContent || "";
    return [
      { t: "Agrega a tu lista", items: [
        { e: "📷", c: "#FFB23F", n: "Escanear", s: "Código de barras", go: () => $("scanBtn").click() },
        SR && { e: "🎤", c: "#E5484D", n: "Con tu voz", s: "Dilo y se agrega", go: startVoice },
        { e: "🥦", c: "#3FA35B", n: "Categorías", s: "Productos comunes", go: () => $("typeIn").click() },
        aiOn && { e: "📝", c: "#8B67CF", n: "Lista de papel", s: "Tómale foto", ai: true, go: () => $("paperIn").click() },
        { e: "💡", c: "#E3B93B", n: "Te toca comprar", s: "Te recuerda", go: explainHabits },
        aiOn && { e: "👩‍🍳", c: "#DD6A9E", n: "¿Qué cocino?", s: "Recetas con lo tuyo", ai: true, go: () => { if (!freezerItems().length) { toast(T("Agrega productos al Freezer, Refri o Despensa primero")); return; } $("cookBtn").click(); } },
      ] },
      { t: "En tu cocina", items: [
        { e: "❄️", c: "#58B9E6", n: "Freezer", s: "Fechas y avisos", go: () => openFreezerAt("freezer") },
        { e: "🥛", c: "#3E8ED8", n: "Refri", s: "Lo que vence pronto", go: () => openFreezerAt("refri") },
        { e: "🥫", c: "#E8802F", n: "Despensa", s: "Lo que tienes", go: () => openFreezerAt("despensa") },
      ] },
      { t: "Tus gastos", items: [
        { e: "🧾", c: "#C98A3C", n: "Mis Compras", s: amt || "Recibos y calendario", go: () => openCompras() },
        { e: "💰", c: "#1AA3A3", n: "Presupuesto", s: "Cuánto te queda", go: () => openCompras(editBudget) },
        { e: "🏷️", c: "#9A6A4A", n: "Comparar precios", s: "Dónde es más barato", go: () => openCompras(openPrices) },
      ] },
      { t: "Familia y cuenta", items: [
        { e: "👨‍👩‍👧", c: "#7A5BBF", n: "Lista compartida", s: "Con tu familia", go: () => $("shareLiveBtn").click() },
        { e: "📤", c: "#3FA35B", n: "Enviar lista", s: "Por mensaje", go: () => $("shareBtn").click() },
        ($("plusCard") && !$("plusCard").classList.contains("hidden")) && { e: "👤", c: "#8C8C8C", n: "Mi cuenta", s: "Plan y foto", go: () => $("plusCard").click() },
      ] },
    ].map(g => ({ t: g.t, items: g.items.filter(Boolean) }));
  }
  function renderMenu() {
    const box = $("toolsMenu"); if (!box) return;
    const h = el("h2", "tools-title", "Todo lo que puedes hacer");
    const parts = [h];
    menuGroups().forEach(g => {
      const sec = el("div", "tools-group");
      sec.append(el("h3", "", g.t));
      const grid = el("div", "tools-grid");
      g.items.forEach(it => {
        const b = el("button", "tool"); b.type = "button";
        const ic = el("span", "tool-ico", it.e); ic.style.setProperty("--tc", it.c); ic.setAttribute("aria-hidden", "true");
        if (it.ai) { const tag = el("span", "tool-ai", "IA"); ic.append(tag); }
        b.append(ic, el("b", "", it.n), el("small", "", it.s));
        b.onclick = it.go;
        grid.append(b);
      });
      sec.append(grid); parts.push(sec);
    });
    box.replaceChildren(...parts);
  }
  // El total de Mis Compras cambia: se actualiza en el menú.
  if ($("pcLinkAmt")) new MutationObserver(() => { const t = document.querySelector('.tool-ico + b + small'); renderMenu(); }).observe($("pcLinkAmt"), { childList: true, characterData: true, subtree: true });

  if ($("plusCard")) new MutationObserver(renderMenu).observe($("plusCard"), { attributes: true, attributeFilter: ["class"] });

  /* ================= inicio ================= */
  renderCard();
  renderMenu();
  checkAI();
  if (window.MiCuenta) MiCuenta.onChange(() => checkAI());
  window.addEventListener("storage", e => { if (e.key === HKEY) renderCard(); if (e.key === BKEY || e.key === "purchases-v1") renderBudget(false); });
  renderBudget(false);
})();
