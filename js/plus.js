/* Mi cuenta y Mi Lista Plus.
   Con cuentas (authRequired): Plus se revisa por cuenta. Fundadoras (primeras registradas) = gratis.
   Las demás pagan con Stripe; el pago queda unido a su cuenta y funciona en cualquier teléfono.
   Sin cuentas: se usa el código de 12 letras como antes. */
(function () {
  const CFG = window.PLUS_CONFIG || {};
  const $ = id => document.getElementById(id);
  const ACC = () => window.MiCuenta && window.MiCuenta.required() ? window.MiCuenta : null;
  const FEATURES = {
    freezer: { sel: "#freezerBtn", name: "Freezer Scan", desc: "Escanea lo que congelas y recibe un aviso antes de que venza" },
    compras: { sel: "#comprasBtn", name: "Mis Compras", desc: "Escanea tus recibos y lleva el gasto del mes" },
    compartida: { sel: "#shareLiveBtn", name: "Lista compartida", desc: "La misma lista en los teléfonos de tu familia" },
  };
  const ALL_DESC = [
    ["Mi lista", "Escanea productos, categorías automáticas, enviar y descargar la lista"],
    ["Freezer Scan", "Escanea lo que congelas y recibe un aviso antes de que venza"],
    ["Mis Compras", "Escanea tus recibos y lleva el gasto del mes"],
    ["Lista compartida", "La misma lista en los teléfonos de tu familia"],
  ];
  const whole = (CFG.features || []).includes("todo");
  const feats = (CFG.features || []).filter(f => FEATURES[f]);

  /* ---------- estado de Plus ---------- */
  const PK = "plus-v1", AK = "plus-acct-v1";
  let st = null, ast = null;
  try { st = JSON.parse(localStorage.getItem(PK)); } catch {}
  try { ast = JSON.parse(localStorage.getItem(AK)); } catch {}
  const saveSt = () => { try { st ? localStorage.setItem(PK, JSON.stringify(st)) : localStorage.removeItem(PK); } catch {} };
  const saveAst = () => { try { ast ? localStorage.setItem(AK, JSON.stringify(ast)) : localStorage.removeItem(AK); } catch {} };
  const enabled = () => !!CFG.enabled;
  function isPlus() {
    if (ACC()) {
      const u = ACC().user();
      if (!u) return false;
      if (u.founder) return true;
      return !!(ast && ast.uid === u.uid && ast.active && (!ast.until || ast.until * 1000 > Date.now() || ast.status === "founder"));
    }
    return !!(st && st.token && st.until * 1000 > Date.now());
  }
  const locked = f => enabled() && (whole || feats.includes(f)) && !isPlus();
  const pretty = c => String(c || "").replace(/(.{4})(?=.)/g, "$1-");
  const fmtDate = s => new Date(s * 1000).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

  /* ---------- bloqueo ---------- */
  document.addEventListener("click", e => {
    if (!enabled() || whole) return; // con "todo", la app entera se bloquea con la pantalla de Plus
    for (const f of feats) {
      if (e.target.closest(FEATURES[f].sel) && locked(f)) {
        e.preventDefault(); e.stopImmediatePropagation();
        openSheet("paywall", f); return;
      }
    }
  }, true);
  function enforceWhole() {
    if (!enabled() || !whole) return;
    if (ACC() && !ACC().user()) return; // primero tiene que entrar a su cuenta
    if (locked("todo")) openSheet("paywall", null, null, null, true);
    else if ($("plusSheet").dataset.blocking === "1") closeSheet(true);
  }

  /* ---------- servidor ---------- */
  async function api(path, body) {
    const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: d };
  }
  async function refreshAccount(force) {
    const A = ACC(); if (!A || !A.user()) return;
    const u = A.user();
    if (!force && ast && ast.uid === u.uid && Date.now() - (ast.checked || 0) < 6 * 3600 * 1000) return;
    if (!navigator.onLine) return;
    try {
      const { ok, data } = await api("/api/plus-account", { auth: A.token() });
      if (ok) { ast = Object.assign({ uid: u.uid, checked: Date.now() }, data); saveAst(); }
    } catch {}
    updateCard(); enforceWhole();
  }
  async function verifySession(id) {
    openSheet("working", null, "Confirmando tu pago…");
    try {
      const { ok, data } = await api("/api/plus-verify?session=" + encodeURIComponent(id));
      if (ok && data.active) {
        if (ACC()) { await refreshAccount(true); if (!isPlus()) { ast = { uid: ACC().user() && ACC().user().uid, active: true, status: data.status, until: data.until, checked: Date.now() }; saveAst(); } }
        else { st = { token: data.token, until: data.until, code: data.code, status: data.status, checked: Date.now() }; saveSt(); }
        updateCard(); openSheet("welcome");
      } else openSheet("paywall", null, null, data.error || "No se pudo confirmar el pago. Si ya pagaste, escríbenos.", whole);
    } catch { openSheet("paywall", null, null, "Sin conexión. Vuelve a abrir la app con internet para confirmar tu pago.", whole); }
  }
  async function restore(code) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 12) { showError("El código tiene 12 letras y números."); return; }
    openSheet("working", null, "Revisando tu código…");
    try {
      const { ok, data } = await api("/api/plus-restore", { code: clean });
      if (ok && data.active) { st = { token: data.token, until: data.until, code: data.code, status: data.status, checked: Date.now() }; saveSt(); updateCard(); openSheet("welcome"); }
      else openSheet("paywall", null, null, data.error || "No se pudo usar ese código.");
    } catch { openSheet("paywall", null, null, "Sin conexión. Intenta de nuevo con internet."); }
  }
  async function refreshCode() {
    if (ACC() || !st || !st.token || !navigator.onLine) return;
    if (st.checked && Date.now() - st.checked < 12 * 3600 * 1000) return;
    try {
      const { ok, status, data } = await api("/api/plus-status", { token: st.token });
      if (ok && data.active) { st = { token: data.token, until: data.until, code: data.code || st.code, status: data.status, checked: Date.now() }; saveSt(); }
      else if (ok) { st.until = 0; st.checked = Date.now(); saveSt(); }
      else if (status === 401) { st = null; saveSt(); }
    } catch {}
    updateCard();
  }
  async function manage() {
    openSheet("working", null, "Abriendo tu suscripción…");
    try {
      const body = ACC() ? { auth: ACC().token() } : { token: st.token };
      const { ok, data } = await api("/api/plus-portal", body);
      if (ok && data.url) { location.href = data.url; return; }
      openSheet("account", null, null, data.error || "No se pudo abrir el portal.");
    } catch { openSheet("account", null, null, "Sin conexión. Intenta de nuevo con internet."); }
  }
  function planLink(p) {
    const A = ACC(); const u = A && A.user();
    if (!u) return p.link;
    const sep = p.link.includes("?") ? "&" : "?";
    return p.link + sep + "client_reference_id=" + encodeURIComponent(u.uid) + "&prefilled_email=" + encodeURIComponent(u.email);
  }

  /* ---------- pantalla ---------- */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(label, cls, fn) { const b = el("button", cls, label); b.type = "button"; b.onclick = fn; return b; }
  function showError(msg) { const e = $("plusError"); if (e) { e.textContent = msg; e.classList.toggle("hidden", !msg); } }
  function planText() {
    const A = ACC(), u = A && A.user();
    if (!enabled()) return "";
    if (u && u.founder) return "Plus gratis (de las primeras)";
    if (isPlus()) return (ast && ast.status === "trialing") || (st && st.status === "trialing") ? "Prueba gratis activa" : "Plus activo";
    return whole ? "Sin suscripción" : "Desbloquea Plus";
  }
  function updateCard() {
    const card = $("plusCard"), A = ACC(), u = A && A.user();
    if (A) {
      if (!u) { card.classList.add("hidden"); return; }
      card.classList.remove("hidden");
      $("plusCardTitle").textContent = "Mi cuenta";
      $("plusCardIco").textContent = (u.name || "?").trim().charAt(0).toUpperCase() || "👤";
      $("plusSub").textContent = u.name + (enabled() ? " · " + planText() : " · " + u.email);
      card.classList.toggle("on", isPlus());
      return;
    }
    if (!enabled()) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");
    $("plusCardTitle").textContent = "Mi Lista Plus"; $("plusCardIco").textContent = "⭐";
    $("plusSub").textContent = isPlus() ? planText() : "Desbloquea " + feats.map(f => FEATURES[f].name).join(", ").replace(/, ([^,]*)$/, " y $1");
    card.classList.toggle("on", isPlus());
  }

  function openSheet(mode, feature, workingText, errorText, blocking) {
    const box = $("plusBody"); box.replaceChildren();
    const title = $("plusTitle");
    const sheet = $("plusSheet");
    sheet.dataset.blocking = blocking ? "1" : "";
    const A = ACC(), u = A && A.user();
    if (mode === "working") {
      title.textContent = "Mi Lista Plus";
      box.append(el("p", "plus-working", workingText || "Un momento…"));
    } else if (mode === "welcome") {
      title.textContent = "¡Ya tienes Plus! ⭐";
      box.append(el("p", "plus-lead", "Gracias por tu suscripción. Ya puedes usar todas las funciones."));
      if (A) box.append(el("p", "plus-note", "Tu suscripción quedó unida a tu cuenta (" + (u ? u.email : "") + "). Entra con tu correo en cualquier teléfono y la tendrás activa."));
      else { box.append(codeBox()); box.append(el("p", "plus-note", "Guarda este código. Si tienes la app instalada o cambias de teléfono, toca Mi Lista Plus → escribe tu código.")); }
      box.append(btn("Empezar", "sh-primary", () => closeSheet(true)));
    } else if (mode === "account") {
      title.textContent = "Mi cuenta";
      if (u) {
        const who = el("div", "acct-who");
        who.append(el("span", "acct-ava", (u.name || "?").charAt(0).toUpperCase()));
        const t = el("div"); t.append(el("b", "", u.name), el("small", "", u.email)); who.append(t);
        box.append(who);
      }
      if (errorText) box.append(el("p", "pc-error", errorText));
      if (enabled()) {
        const s = el("div", "sh-status"); const d = el("span", "sh-dot"); d.dataset.s = isPlus() ? "live" : "offline";
        let txt = planText();
        if (u && u.founder) txt += " · eres la número " + u.n;
        else if (isPlus() && ast && ast.until) txt += " · se renueva o vence el " + fmtDate(ast.until - 3 * 86400);
        else if (!A && isPlus() && st) txt += " · se renueva o vence el " + fmtDate(st.until - 3 * 86400);
        s.append(d, el("span", "", txt)); box.append(s);
        if (!A && st && st.code) box.append(codeBox());
        if (isPlus() && !(u && u.founder)) box.append(btn("Administrar suscripción", "sh-primary", manage));
        if (!isPlus()) box.append(btn("Ver planes de Plus", "sh-primary", () => openSheet("paywall")));
      }
      if (CFG.supportEmail) box.append(el("p", "plus-note", "¿Dudas? Escríbenos a " + CFG.supportEmail));
      if (A) box.append(btn("Cerrar sesión", "sh-danger", () => { closeSheet(true); A.logout(); }));
      box.append(btn("Cerrar", "sh-ghost", () => closeSheet()));
    } else { // paywall
      title.textContent = "Mi Lista Plus ⭐";
      box.append(el("p", "plus-lead", whole
        ? "Para seguir usando la app, suscríbete a Plus."
        : feature ? FEATURES[feature].name + " es parte de Plus." : "Desbloquea todo lo que hace más fácil tu súper."));
      const ul = el("ul", "plus-feats");
      (whole ? ALL_DESC : feats.map(f => [FEATURES[f].name, FEATURES[f].desc])).forEach(([n, d]) => { const li = el("li"); li.append(el("b", "", n), el("span", "", d)); ul.append(li); });
      box.append(ul);
      const plans = el("div", "plus-plans");
      [["yearly", CFG.yearly], ["monthly", CFG.monthly]].forEach(([k, p]) => {
        if (!p || !p.link) return;
        const b = btn("", "plus-plan" + (k === "yearly" ? " best" : ""), () => { location.href = planLink(p); });
        b.append(el("b", "", p.label || (k === "yearly" ? "Plan anual" : "Plan mensual")));
        if (p.price) b.append(el("span", "", p.price));
        if (p.note) b.append(el("em", "", p.note));
        plans.append(b);
      });
      if (!plans.children.length) plans.append(el("p", "plus-note", "Los planes todavía no están disponibles."));
      else if (plans.children.length === 1) plans.firstChild.classList.add("best");
      box.append(plans);
      box.append(el("p", "plus-trial", (CFG.trialDays > 0 ? CFG.trialDays + " días gratis para probar. " : "") + "Se renueva automáticamente y puedes cancelar cuando quieras."));
      const err = el("p", "pc-error" + (errorText ? "" : " hidden"), errorText || ""); err.id = "plusError"; box.append(err);
      if (!A) {
        const join = el("div", "sh-join");
        const lbl = el("label", "", "¿Ya pagaste? Escribe tu código"); lbl.htmlFor = "plusCodeIn";
        const row = el("div", "sh-join-row");
        const inp = el("input"); inp.id = "plusCodeIn"; inp.type = "text"; inp.placeholder = "Código de 12 letras"; inp.maxLength = 16; inp.autocomplete = "off";
        inp.addEventListener("keydown", e => { if (e.key === "Enter") restore(inp.value); });
        row.append(inp, btn("Usar código", "", () => restore(inp.value)));
        join.append(lbl, row); box.append(join);
      } else box.append(el("p", "plus-note", "¿Ya pagaste? Cierra y vuelve a abrir la app con internet; tu suscripción se revisa con tu cuenta."));
      if (blocking) {
        if (A) box.append(btn("Ya pagué: revisar otra vez", "sh-ghost", () => refreshAccount(true)));
        if (A) box.append(btn("Cerrar sesión", "sh-ghost", () => { closeSheet(true); A.logout(); }));
      } else box.append(btn("Ahora no", "sh-ghost", () => closeSheet()));
    }
    sheet.classList.remove("hidden");
  }
  function codeBox() {
    const c = el("div", "sh-code");
    c.append(el("small", "", "Tu código de Plus"), el("b", "", pretty(st && st.code)));
    const copy = btn("Copiar código", "plus-copy", async () => {
      try { await navigator.clipboard.writeText(pretty(st.code)); copy.textContent = "Copiado ✓"; } catch { copy.textContent = pretty(st.code); }
    });
    c.append(copy); return c;
  }
  function closeSheet(force) {
    if (!force && $("plusSheet").dataset.blocking === "1") return;
    $("plusSheet").classList.add("hidden"); $("plusSheet").dataset.blocking = "";
    enforceWhole();
  }
  $("plusSheet").addEventListener("click", e => { if (e.target === $("plusSheet")) closeSheet(); });
  $("plusCard").onclick = () => openSheet(ACC() ? "account" : (isPlus() ? "account" : "paywall"));

  /* ---------- inicio ---------- */
  window.MiListaPlus = { isPlus, locked, open: () => openSheet(ACC() ? "account" : "paywall") };
  if (ACC()) ACC().onChange(a => {
    if (!a) { ast = null; saveAst(); }
    updateCard();
    if (a) refreshAccount(true);
  });
  updateCard();
  const params = new URLSearchParams(location.search);
  const session = params.get("plus_session"), back = params.get("plus");
  if (session || back) history.replaceState(null, "", location.pathname);
  if (enabled() && session) verifySession(session);
  else if (enabled() && back) { (ACC() ? refreshAccount(true) : refreshCode()).then(() => { if (isPlus()) openSheet("account"); }); }
  else if (ACC()) refreshAccount(false).then(enforceWhole);
  else refreshCode();
  enforceWhole();
  window.addEventListener("load", () => {
    if (whole) return;
    if (locked("freezer") && !$("freezerView").classList.contains("hidden")) { $("fzBack").click(); openSheet("paywall", "freezer"); }
    if (locked("compras") && !$("comprasView").classList.contains("hidden")) { $("pcBack").click(); openSheet("paywall", "compras"); }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { ACC() ? refreshAccount(false) : refreshCode(); } });
})();
