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
  /* --- ¿Qué cocino? Recetario: tarjetas y ficha completa --- */
  const DIFF_TXT = { 1: "Fácil", 2: "Media", 3: "Difícil" };
  const PALETTES = [["#FFB23F", "#FF7A2E"], ["#3FA35B", "#2B7A43"], ["#DD6A9E", "#B24A7E"], ["#58B9E6", "#2F7FB8"], ["#C98A3C", "#9A6A2A"], ["#8B67CF", "#6A46B8"]];
  let lastRecipes = null;
  const mins = n => n == null ? "" : n >= 60 ? Math.floor(n / 60) + " h" + (n % 60 ? " " + (n % 60) + " min" : "") : n + " min";
  const ingText = i => [i.qty, i.unit, i.name].filter(Boolean).join(" ");
  // Imagen del plato: foto creada con IA (OpenAI) o foto de Wikipedia. Mientras se crea, un diseño con el ícono del plato.
  const photoWait = {};
  const aiSrc = id => "/api/recipe-photo?id=" + id;
  function waitPhoto(r) {
    const id = r.aiPhoto.id;
    if (!photoWait[id]) photoWait[id] = (async () => {
      const start = Date.now();
      while (Date.now() - start < 180000) {
        try {
          const res = await fetch(aiSrc(id));
          if (res.status === 200 && /^image\//.test(res.headers.get("content-type") || "")) { r.aiPhoto.ready = true; return true; }
          const d = await res.json().catch(() => ({}));
          if (d.state === "error" || (d.state === "none" && Date.now() - start > 25000)) return false;
        } catch {}
        await new Promise(ok => setTimeout(ok, 3000));
      }
      return false;
    })();
    return photoWait[id];
  }
  function dishArt(r, cls) {
    const box = el("div", "dish " + cls);
    const pal = PALETTES[Math.abs([...r.title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % PALETTES.length];
    box.style.setProperty("--d1", pal[0]); box.style.setProperty("--d2", pal[1]);
    const design = waiting => {
      box.classList.add("no-photo"); box.classList.toggle("dish-wait", !!waiting);
      const em = el("span", "dish-emoji", r.emoji || "🍽️"); em.setAttribute("aria-hidden", "true");
      const deco = el("span", "dish-deco"); deco.setAttribute("aria-hidden", "true");
      const ems = r.ingredients.map(i => window.Products ? Products.emojiFor([], i.name) : "").filter(e => e && e !== "🛒" && e !== r.emoji);
      deco.textContent = [...new Set(ems)].slice(0, 4).join("  ");
      box.replaceChildren(em, waiting ? el("span", "dish-wait-txt", "📸 " + T("Preparando la foto…")) : deco);
    };
    const show = (src, ai) => {
      const img = el("img"); img.alt = r.title; img.decoding = "async"; img.referrerPolicy = "no-referrer";
      img.onerror = () => design(false);
      img.onload = () => box.classList.add("dish-loaded");
      img.src = src;
      box.classList.remove("no-photo", "dish-wait");
      box.replaceChildren(img);
      if (ai) box.append(el("span", "dish-ai", "✨ " + T("Imagen creada con IA")));
    };
    if (r.aiPhoto) {
      if (r.aiPhoto.ready) show(aiSrc(r.aiPhoto.id), true);
      else { design(true); waitPhoto(r).then(ok => { if (ok) show(aiSrc(r.aiPhoto.id), true); else design(false); }); }
    } else if (r.photo && r.photo.src) show(r.photo.src, false);
    else design(false);
    return box;
  }
  function metaRow(r) {
    const row = el("div", "rc-meta");
    const total = (r.prep || 0) + (r.cook || 0);
    if (total) row.append(el("span", "", "⏱ " + mins(total)));
    if (r.servings) row.append(el("span", "", "🍽 " + r.servings + " " + T(r.servings === 1 ? "porción" : "porciones")));
    if (r.difficulty) row.append(el("span", "", "👩‍🍳 " + T(DIFF_TXT[r.difficulty])));
    return row;
  }
  function showRecipeList(recipes) {
    const list = el("div", "rc-list");
    recipes.forEach(r => {
      const card = el("button", "rc-card"); card.type = "button";
      const haveN = r.ingredients.filter(i => i.have).length, missN = r.ingredients.filter(i => !i.have && !i.basic).length;
      const body = el("div", "rc-body");
      body.append(el("b", "rc-title", r.title));
      if (r.description) body.append(el("p", "rc-desc", r.description));
      body.append(metaRow(r));
      const inv = el("div", "rc-inv");
      inv.append(el("span", "rc-have", "✓ " + T("Usa") + " " + haveN + " " + T(haveN === 1 ? "cosa tuya" : "cosas tuyas")));
      if (missN) inv.append(el("span", "rc-miss", T("Falta") + " " + missN));
      body.append(inv);
      card.append(dishArt(r, "dish-card"), body);
      card.onclick = () => openRecipe(r);
      list.append(card);
    });
    openSheet(title("Ideas para cocinar"), el("p", "", "Usan primero lo que está por vencer. Toca una receta para verla completa."), list, actions(btn("Cerrar", "primary", closeSheet)));
  }
  // Ficha completa de la receta (pantalla entera)
  let rv = null;
  function closeRecipe() { if (rv) { rv.remove(); rv = null; document.body.classList.remove("rv-open"); } }
  function openRecipe(r) {
    closeRecipe();
    rv = el("section", "rv"); rv.setAttribute("role", "dialog"); rv.setAttribute("aria-modal", "true"); rv.setAttribute("aria-label", r.title);
    const hero = el("div", "rv-hero");
    hero.append(dishArt(r, "dish-hero"));
    const back = el("button", "rv-back"); back.type = "button"; back.setAttribute("aria-label", T("Volver a las recetas"));
    back.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    back.onclick = closeRecipe;
    hero.append(back);
    const main = el("div", "rv-main");
    main.append(el("h2", "rv-title", r.title));
    if (r.description) main.append(el("p", "rv-desc", r.description));
    // Datos rápidos
    const stats = el("div", "rv-stats");
    const stat = (k, v) => { const d = el("div", "rv-stat"); d.append(el("small", "", T(k)), el("b", "", v || "—")); stats.append(d); };
    stat("Preparación", mins(r.prep)); stat("Cocción", mins(r.cook)); stat("Porciones", r.servings ? String(r.servings) : ""); stat("Dificultad", r.difficulty ? T(DIFF_TXT[r.difficulty]) : "");
    main.append(stats);
    // Ingredientes: lo que tienes, básicos y lo que falta
    main.append(el("h3", "rv-h", "Ingredientes"));
    const group = (label, cls, arr) => {
      if (!arr.length) return;
      const g = el("div", "rv-ing " + cls);
      g.append(el("div", "rv-ing-head", T(label) + " · " + arr.length));
      const ul = el("ul");
      arr.forEach(i => { const li = el("li"); li.append(el("span", "rv-dot"), el("span", "", ingText(i))); ul.append(li); });
      g.append(ul); main.append(g);
    };
    const have = r.ingredients.filter(i => i.have), basic = r.ingredients.filter(i => !i.have && i.basic), miss = r.ingredients.filter(i => !i.have && !i.basic);
    group("De tu inventario", "have", have);
    group("Básicos de cocina", "basic", basic);
    group("Te falta comprar", "miss", miss);
    if (miss.length) {
      const addMiss = btn("🛒 " + T("Agregar lo que falta a mi lista"), "rv-addmiss", () => {
        miss.forEach(i => MiLista.add({ name: i.name.charAt(0).toUpperCase() + i.name.slice(1) }));
        toast(miss.length === 1 ? T("Se agregó 1 producto") : T("Se agregaron") + " " + miss.length + " " + T("productos"));
        addMiss.disabled = true; addMiss.textContent = "✓ " + T("Agregado a tu lista");
      });
      main.append(addMiss);
    }
    // Preparación
    main.append(el("h3", "rv-h", "Preparación"));
    const ol = el("ol", "rv-steps");
    r.steps.forEach((st, k) => { const li = el("li"); li.append(el("span", "rv-num", String(k + 1)), el("p", "", st)); ol.append(li); });
    main.append(ol);
    // Consejos
    if (r.tips && r.tips.length) {
      main.append(el("h3", "rv-h", "Consejos"));
      r.tips.forEach(tp => { const d = el("div", "rv-tip"); d.append(el("span", "rv-tip-ico", "💡"), el("p", "", tp)); main.append(d); });
    }
    // Crédito de la foto (Wikimedia pide dar crédito)
    if (r.aiPhoto) main.append(el("p", "rv-credit", "Imagen creada con IA para mostrar cómo puede quedar el plato."));
    else if (r.photo && r.photo.src) {
      const c = el("p", "rv-credit");
      c.append(document.createTextNode(T("Foto:") + " " + r.photo.credit + (r.photo.license ? " · " + r.photo.license : "") + " · "));
      const a = el("a", "", "Wikimedia Commons"); a.href = r.photo.link || "https://commons.wikimedia.org"; a.target = "_blank"; a.rel = "noopener";
      c.append(a); main.append(c);
    }
    main.append(el("p", "rv-ai", "Receta creada con IA a partir de lo que tienes. Revisa cantidades y tiempos según tu cocina."));
    rv.append(hero, main);
    document.body.append(rv); document.body.classList.add("rv-open");
    rv.scrollTop = 0; back.focus();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && rv) { e.stopImmediatePropagation(); closeRecipe(); } }, true);
  $("cookBtn").onclick = async () => {
    const items = freezerItems();
    if (!items.length) { toast(T("Agrega productos al Freezer, Refri o Despensa primero")); return; }
    loading("Buscando recetas…", "Con lo que tienes, empezando por lo que vence primero");
    let recipes;
    try { recipes = (await ai({ action: "recipes", items })).recipes || []; } catch (err) { aiError(err); return; }
    if (!recipes.length) { aiError(new Error("fail")); return; }
    lastRecipes = recipes;
    showRecipeList(recipes);
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
        { e: "🛒", c: "#2E9E6A", n: "Mi carrito", s: (() => { const c = cartData(); return c.items.length ? T("Llevas") + " " + money(cartTotal(c)) : "Suma precios al comprar"; })(), go: openCart },
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

  /* ================= Mi carrito: escanear precios en la tienda ================= */
  // Mientras compras, tómale foto a la etiqueta del precio: se suma sola y te avisa antes de pasarte de tu límite.
  const CKEY = "cart-v1";
  const cartData = () => { const c = readJSON(CKEY, null) || {}; return { limit: c.limit || 0, tax: +c.tax || 0, items: Array.isArray(c.items) ? c.items : [], warned: c.warned || 0 }; };
  const cartSave = c => { try { localStorage.setItem(CKEY, JSON.stringify(c)); } catch {} };
  const cartSub = c => c.items.reduce((a, i) => a + Math.round(i.cents * (+i.qty || 1)), 0);
  const cartTotal = c => { const sub = cartSub(c); return sub + Math.round(sub * c.tax / 100); };
  const toCents = v => { const n = parseFloat(String(v || "").replace(/[^0-9.,]/g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0; };
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
  let cv = null;

  function cartLevel(c, total) { if (!c.limit) return 0; const r = total / c.limit; return r > 1 ? 3 : r >= 1 ? 2 : r >= 0.8 ? 1 : 0; }
  // Avisos al cruzar el 80 % y el 100 % del límite.
  function cartAlert(c) {
    const total = cartTotal(c), lvl = cartLevel(c, total);
    if (lvl > c.warned) {
      if (lvl === 1) { toast("⚠️ " + T("Ya llevas el 80% de tu límite. Te quedan") + " " + money(c.limit - total)); buzz([120, 80, 120]); }
      else if (lvl === 2) { toast("🛑 " + T("Llegaste a tu límite.")); buzz([250, 100, 250]); }
      else { toast("🛑 " + T("Te pasaste de tu límite por") + " " + money(total - c.limit)); buzz([300, 120, 300, 120, 300]); }
    }
    c.warned = lvl;
  }

  function closeCart() { if (cv) { cv.remove(); cv = null; document.body.classList.remove("rv-open"); renderMenu(); } }
  function openCart() {
    closeSheet(); closeCart();
    cv = el("section", "cart"); cv.setAttribute("role", "dialog"); cv.setAttribute("aria-modal", "true"); cv.setAttribute("aria-label", T("Mi carrito"));
    document.body.append(cv); document.body.classList.add("rv-open");
    paintCart();
  }
  function paintCart() {
    if (!cv) return;
    const c = cartData(), sub = cartSub(c), total = cartTotal(c), lvl = cartLevel(c, total);
    const head = el("header", "cart-head");
    const back = el("button", "rv-back cart-back"); back.type = "button"; back.setAttribute("aria-label", T("Cerrar"));
    back.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    back.onclick = closeCart;
    const ht = el("div", "cart-htxt"); ht.append(el("h2", "", "Mi carrito"), el("small", "", "Escanea el precio y se suma solo"));
    head.append(back, ht);

    // Total y límite
    const box = el("div", "cart-total lvl" + lvl);
    box.append(el("small", "", T("Llevas")), el("b", "cart-amt", money(total)));
    if (c.tax) box.append(el("small", "cart-taxnote", T("Incluye impuesto") + " " + c.tax + "% (" + money(total - sub) + ")"));
    if (c.limit) {
      const bar = el("div", "cart-bar"); const fill = el("span"); fill.style.width = Math.min(100, Math.round(total / c.limit * 100)) + "%"; bar.append(fill);
      const left = c.limit - total;
      box.append(bar, el("div", "cart-left", left >= 0 ? (en() ? "You have " + money(left) + " left of " + money(c.limit) : "Te quedan " + money(left) + " de " + money(c.limit)) : "🛑 " + T("Te pasaste por") + " " + money(-left)));
    }
    box.append(btn(c.limit ? "✏️ " + T("Cambiar límite") : "🎯 " + T("Ponle un límite a tu compra"), "cart-limit-btn", editCartLimit));

    // Botones para agregar
    const add = el("div", "cart-add");
    const scanLab = el("label", "cart-scan");
    const inp = el("input"); inp.type = "file"; inp.accept = "image/*"; inp.setAttribute("capture", "environment"); inp.className = "sr-only";
    inp.onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) readPrice(f); };
    scanLab.append(inp, el("span", "cart-scan-ico", "📷"), el("b", "", T("Escanear precio")), el("small", "", T("Tómale foto a la etiqueta")));
    const typeBtn = btn("✍️ " + T("Escribir precio"), "cart-type", () => confirmItem({}));
    add.append(scanLab, typeBtn);

    // Lista de productos
    const list = el("ul", "cart-list");
    c.items.slice().reverse().forEach(it => {
      const li = el("li");
      const info = el("div", "cart-info");
      info.append(el("b", "", it.name || T("Producto")), el("small", "", money(it.cents) + (it.per && it.per !== "each" ? " / " + it.per : "") + (it.deal ? " · " + it.deal : "")));
      const step = el("div", "cart-step");
      const qtyTxt = it.per && it.per !== "each" ? it.qty + " " + it.per : "×" + it.qty;
      const minus = btn("−", "", () => { const d = cartData(), x = d.items.find(y => y.id === it.id); if (!x) return; if (x.per && x.per !== "each") { d.items = d.items.filter(y => y.id !== it.id); } else if (x.qty > 1) x.qty--; else d.items = d.items.filter(y => y.id !== it.id); d.warned = Math.min(d.warned, cartLevel(d, cartTotal(d))); cartSave(d); paintCart(); });
      minus.setAttribute("aria-label", T("Quitar uno"));
      const plus = btn("+", "", () => { const d = cartData(), x = d.items.find(y => y.id === it.id); if (!x) return; x.qty = (+x.qty || 1) + 1; cartAlert(d); cartSave(d); paintCart(); });
      plus.setAttribute("aria-label", T("Agregar otro"));
      if (it.per && it.per !== "each") plus.disabled = true;
      step.append(minus, el("span", "", qtyTxt), plus);
      li.append(info, el("b", "cart-line", money(Math.round(it.cents * (+it.qty || 1)))), step);
      list.append(li);
    });
    const empty = !c.items.length ? el("p", "cart-empty", "Tu carrito está vacío. Cuando eches algo al carrito, escanea su precio.") : null;

    const foot = el("div", "cart-foot");
    if (c.items.length) foot.append(btn("✅ " + T("Terminé mi compra"), "cart-done", () => {
      if (!confirm(T("¿Vaciar el carrito? Se borra la suma de esta compra."))) return;
      const d = cartData(); d.items = []; d.warned = 0; cartSave(d); paintCart(); toast(T("Carrito vacío. ¡Listo para la próxima compra!"));
    }));
    const main = el("div", "cart-main");
    main.append(box, add);
    if (c.items.length) main.append(el("h3", "cart-h", T("En tu carrito") + " · " + c.items.reduce((a, i) => a + (i.per && i.per !== "each" ? 1 : +i.qty || 1), 0)));
    main.append(empty || list, foot);
    cv.replaceChildren(head, main);
  }

  function editCartLimit() {
    const c = cartData();
    const f = el("form", "cart-form");
    const l1 = el("label", "", T("¿Cuánto puedes gastar en esta compra?"));
    const lim = el("input"); lim.type = "text"; lim.inputMode = "decimal"; lim.placeholder = "$80"; lim.value = c.limit ? (c.limit / 100).toFixed(2) : "";
    const l2 = el("label", "", T("Impuesto (%) — opcional"));
    const tax = el("input"); tax.type = "text"; tax.inputMode = "decimal"; tax.placeholder = "0"; tax.value = c.tax || "";
    const hint = el("small", "cart-hint", "En Texas casi toda la comida no paga impuesto. Déjalo en 0 si compras solo comida.");
    f.append(l1, lim, l2, tax, hint);
    const save = btn("Guardar", "primary", () => {
      const d = cartData(); d.limit = toCents(lim.value); d.tax = Math.max(0, Math.min(20, parseFloat(String(tax.value).replace(",", ".")) || 0));
      d.warned = 0; cartAlert(d); d.warned = cartLevel(d, cartTotal(d)); cartSave(d); cartModalClose(); paintCart();
    });
    f.onsubmit = e => { e.preventDefault(); save.click(); };
    cartModal(el("h2", "", "Límite de esta compra"), f, actions(btn("Cancelar", "ghost", cartModalClose), save));
    setTimeout(() => lim.focus(), 50);
  }

  // Ventanita dentro de "Mi carrito"
  let cm = null;
  function cartModal(...nodes) {
    cartModalClose();
    cm = el("div", "cart-modal"); const card = el("div", "cart-card"); card.append(...nodes); cm.append(card);
    cm.addEventListener("click", e => { if (e.target === cm) cartModalClose(); });
    (cv || document.body).append(cm);
  }
  function cartModalClose() { if (cm) { cm.remove(); cm = null; } }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && cv) { e.stopImmediatePropagation(); if (cm) cartModalClose(); else closeCart(); } }, true);

  // Leer el precio de la foto: con IA si está activa; si no (o sin internet), con el lector del teléfono.
  async function readPrice(file) {
    const wait = el("div", "smart-loading"); wait.append(el("span", "smart-spin"), el("b", "", T("Leyendo el precio…")), el("small", "", T("Esto toma unos segundos")));
    cartModal(wait);
    let thumb = ""; try { thumb = await shrink(file, 480); } catch {}
    let got = null;
    if (aiOn && navigator.onLine) {
      try { const image = await shrink(file, 1400); const d = await ai({ action: "price", image }); if (d.cents) got = { name: d.name, cents: d.cents, regular: d.regular, per: d.per, deal: d.deal }; else got = { name: d.name }; }
      catch (e) { got = null; }
    }
    let options = [];
    if (!got || !got.cents) {
      try { options = await ocrPrices(file); } catch {}
      got = Object.assign({}, got || {}, options.length ? { cents: options[0] } : {});
    }
    confirmItem(Object.assign({ thumb, options }, got));
  }

  let priceWorker = null;
  async function ocrPrices(file) {
    if (!window.Tesseract) await new Promise((ok, no) => { const s = document.createElement("script"); s.src = "vendor/tesseract/tesseract.min.js"; s.onload = ok; s.onerror = no; document.head.append(s); });
    const abs = p => new URL(p, location.href).href;
    if (!priceWorker) priceWorker = (async () => {
      const w = await Tesseract.createWorker("eng", 1, { workerPath: abs("vendor/tesseract/worker.min.js"), corePath: abs("vendor/tesseract/"), langPath: abs("vendor/tesseract/"), gzip: false, cacheMethod: "none" });
      await w.setParameters({ tessedit_char_whitelist: "0123456789$.,/¢ ", tessedit_pageseg_mode: "11" });
      return w;
    })().catch(e => { priceWorker = null; throw e; });
    const w = await priceWorker;
    const url = await shrink(file, 1600);
    const { data } = await w.recognize(url, {}, { text: true, blocks: true });
    return pricesFrom(data);
  }
  // De todo el texto de la etiqueta, los números que parecen precio (el más grande primero; nunca el precio por onza).
  function pricesFrom(data) {
    const words = [];
    (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => (l.words || []).forEach(w => words.push(w)))));
    if (!words.length && data.text) data.text.split(/\s+/).forEach(t => words.push({ text: t, bbox: { y0: 0, y1: 1 } }));
    const cands = [];
    words.forEach((w, k) => {
      const t = String(w.text || ""), next = String((words[k + 1] || {}).text || "");
      if (/[¢\/]/.test(t) || /^[¢\/]/.test(next)) return;
      const h = (w.bbox.y1 - w.bbox.y0) || 1;
      let m = /\$?(\d{1,3})[.,](\d{2})(?!\d)/.exec(t);
      if (m) { cands.push({ c: +m[1] * 100 + +m[2], h }); return; }
      m = /^\$?(\d{3,4})$/.exec(t);
      if (m) cands.push({ c: +m[1], h: h * 0.9 }); // "398" con centavos chiquitos = 3.98
    });
    const out = [];
    cands.filter(x => x.c >= 10 && x.c < 100000).sort((a, b) => b.h - a.h).forEach(x => { if (!out.includes(x.c)) out.push(x.c); });
    return out.slice(0, 3);
  }

  // Revisar antes de sumar: nombre, precio y cantidad. Avisa si con esto te pasas.
  function confirmItem(d) {
    const c = cartData();
    const f = el("form", "cart-form");
    if (d.thumb) { const im = el("img", "cart-thumb"); im.src = d.thumb; im.alt = ""; f.append(im); }
    if (d.thumb && !d.cents) f.append(el("p", "cart-warn", "No pude leer el precio. Escríbelo aquí abajo."));
    const ln = el("label", "", T("Producto"));
    const name = el("input"); name.type = "text"; name.placeholder = T("Ej. leche, huevos, pollo"); name.value = d.name || ""; name.autocapitalize = "sentences";
    const pend = (window.MiLista && MiLista.getItems ? MiLista.getItems() : []).filter(i => !i.done).slice(0, 8);
    let chips = null;
    if (!d.name && pend.length) { chips = el("div", "cart-chips"); pend.forEach(i => chips.append(btn(i.name, "chip", () => { name.value = i.name; }))); }
    const lp = el("label", "", d.per && d.per !== "each" ? T("Precio por") + " " + d.per : T("Precio"));
    const price = el("input"); price.type = "text"; price.inputMode = "decimal"; price.placeholder = "$0.00"; price.value = d.cents ? (d.cents / 100).toFixed(2) : "";
    let pchips = null;
    const opts = [...new Set([d.cents, ...(d.options || [])].filter(Boolean))];
    if (opts.length > 1) { pchips = el("div", "cart-chips"); opts.forEach(o => pchips.append(btn(money(o), "chip", () => { price.value = (o / 100).toFixed(2); paintWarn(); }))); }
    const deal = d.regular && d.cents && d.regular > d.cents ? el("p", "cart-deal", "🏷️ " + T("En oferta. Precio normal:") + " " + money(d.regular) + (d.deal ? " · " + d.deal : "")) : d.deal ? el("p", "cart-deal", "🏷️ " + d.deal) : null;
    const weighed = d.per && d.per !== "each";
    const lq = el("label", "", weighed ? T("¿Cuánto pesa?") + " (" + d.per + ")" : T("Cantidad"));
    const qty = el("input"); qty.type = "text"; qty.inputMode = "decimal"; qty.value = weighed ? "" : "1"; qty.placeholder = weighed ? "1.5" : "1";
    const warn = el("p", "cart-after");
    function paintWarn() {
      const cents = toCents(price.value), q = parseFloat(String(qty.value).replace(",", ".")) || (weighed ? 0 : 1);
      if (!cents) { warn.textContent = ""; warn.className = "cart-after"; return; }
      const sub = cartSub(c) + Math.round(cents * q), total = sub + Math.round(sub * c.tax / 100);
      if (!c.limit) { warn.textContent = T("Total con este producto:") + " " + money(total); warn.className = "cart-after"; return; }
      const left = c.limit - total;
      if (left < 0) { warn.textContent = "🛑 " + T("Con este producto te pasas por") + " " + money(-left); warn.className = "cart-after over"; }
      else if (total >= c.limit * 0.8) { warn.textContent = "⚠️ " + (en() ? "You'd have " + money(left) + " left of " + money(c.limit) : "Te quedarían " + money(left) + " de " + money(c.limit)); warn.className = "cart-after near"; }
      else { warn.textContent = "✓ " + (en() ? "You'd have " + money(left) + " left" : "Te quedarían " + money(left)); warn.className = "cart-after ok"; }
    }
    price.oninput = paintWarn; qty.oninput = paintWarn;
    f.append(ln, name); if (chips) f.append(chips);
    f.append(lp, price); if (pchips) f.append(pchips); if (deal) f.append(deal);
    f.append(lq, qty, warn);
    const ok = btn("🛒 " + T("Sumar al carrito"), "primary", () => {
      const cents = toCents(price.value);
      if (!cents) { price.focus(); warn.textContent = T("Escribe el precio."); warn.className = "cart-after over"; return; }
      let q = parseFloat(String(qty.value).replace(",", "."));
      if (!(q > 0)) { if (weighed) { qty.focus(); warn.textContent = T("Escribe cuánto pesa."); warn.className = "cart-after over"; return; } q = 1; }
      const dd = cartData();
      dd.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name.value.trim().slice(0, 60), cents, qty: weighed ? Math.round(q * 100) / 100 : Math.max(1, Math.round(q)), per: weighed ? d.per : "each", deal: d.deal || "" });
      cartAlert(dd); cartSave(dd); cartModalClose(); paintCart();
    });
    f.onsubmit = e => { e.preventDefault(); ok.click(); };
    cartModal(el("h2", "", d.thumb ? "Revisa el precio" : "Agregar producto"), f, actions(btn("Cancelar", "ghost", cartModalClose), ok));
    paintWarn();
    if (!d.thumb) setTimeout(() => price.focus(), 50);
  }
  window.Carrito = { open: openCart };

  /* ================= inicio ================= */
  renderCard();
  renderMenu();
  checkAI();
  if (window.MiCuenta) MiCuenta.onChange(() => checkAI());
  window.addEventListener("storage", e => { if (e.key === HKEY) renderCard(); if (e.key === BKEY || e.key === "purchases-v1") renderBudget(false); });
  renderBudget(false);
})();
