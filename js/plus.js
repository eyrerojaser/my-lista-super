/* Mi Lista Plus: bloqueo de funciones de pago y desbloqueo con Stripe.
   Después de pagar, Stripe regresa a la app con ?plus_session=…; la app lo confirma con el servidor
   y guarda un desbloqueo firmado. Con el código de recuperación se desbloquea en otro teléfono. */
(function () {
  const CFG = window.PLUS_CONFIG || {};
  const KEY = "plus-v1";
  const $ = id => document.getElementById(id);
  const FEATURES = {
    freezer: { sel: "#freezerBtn", name: "Freezer Scan", desc: "Escanea lo que congelas y recibe un aviso antes de que venza" },
    compras: { sel: "#comprasBtn", name: "Mis Compras", desc: "Escanea tus recibos y lleva el gasto del mes" },
    compartida: { sel: "#shareLiveBtn", name: "Lista compartida", desc: "La misma lista en vivo en los teléfonos de tu familia" },
  };
  const feats = (CFG.features || []).filter(f => FEATURES[f]);

  let st = null;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch {}
  const save = () => { try { st ? localStorage.setItem(KEY, JSON.stringify(st)) : localStorage.removeItem(KEY); } catch {} };
  const isPlus = () => !!(st && st.token && st.until * 1000 > Date.now());
  const enabled = () => !!CFG.enabled;
  const locked = f => enabled() && feats.includes(f) && !isPlus();
  const pretty = c => String(c || "").replace(/(.{4})(?=.)/g, "$1-");
  const fmtDate = s => new Date(s * 1000).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });

  function store(res) {
    st = { token: res.token, until: res.until, code: res.code || (st && st.code), status: res.status, checked: Date.now() };
    save(); updateCard();
  }

  /* ---------- bloqueo: antes de abrir una función de Plus ---------- */
  document.addEventListener("click", e => {
    if (!enabled()) return;
    for (const f of feats) {
      if (e.target.closest(FEATURES[f].sel) && locked(f)) {
        e.preventDefault(); e.stopImmediatePropagation();
        openSheet("paywall", f);
        return;
      }
    }
  }, true);

  /* ---------- servidor ---------- */
  async function api(path, body) {
    const r = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: d };
  }
  async function verifySession(id) {
    openSheet("working", null, "Confirmando tu pago…");
    try {
      const { ok, data } = await api("/api/plus-verify?session=" + encodeURIComponent(id));
      if (ok && data.active) { store(data); openSheet("welcome"); }
      else openSheet("paywall", null, null, data.error || "No se pudo confirmar el pago. Si ya pagaste, usa tu código o escríbenos.");
    } catch { openSheet("paywall", null, null, "Sin conexión. Vuelve a abrir la app con internet para confirmar tu pago."); }
  }
  async function restore(code) {
    const clean = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (clean.length !== 12) { showError("El código tiene 12 letras y números."); return; }
    openSheet("working", null, "Revisando tu código…");
    try {
      const { ok, data } = await api("/api/plus-restore", { code: clean });
      if (ok && data.active) { store(data); openSheet("welcome"); }
      else openSheet("paywall", null, null, data.error || "No se pudo usar ese código.");
    } catch { openSheet("paywall", null, null, "Sin conexión. Intenta de nuevo con internet."); }
  }
  async function refresh(force) {
    if (!st || !st.token) return;
    if (!force && st.checked && Date.now() - st.checked < 12 * 3600 * 1000) return;
    if (!navigator.onLine) return;
    try {
      const { ok, status, data } = await api("/api/plus-status", { token: st.token });
      if (ok && data.active) store(data);
      else if (ok && data.active === false) { st.until = 0; st.status = "inactive"; st.checked = Date.now(); save(); updateCard(); }
      else if (status === 401) { st = null; save(); updateCard(); }
    } catch {} // sin señal: se mantiene el desbloqueo hasta su fecha
  }
  async function manage() {
    openSheet("working", null, "Abriendo tu suscripción…");
    try {
      const { ok, data } = await api("/api/plus-portal", { token: st.token });
      if (ok && data.url) { location.href = data.url; return; }
      openSheet("active", null, null, data.error || "No se pudo abrir el portal.");
    } catch { openSheet("active", null, null, "Sin conexión. Intenta de nuevo con internet."); }
  }

  /* ---------- pantalla ---------- */
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(label, cls, fn) { const b = el("button", cls, label); b.type = "button"; b.onclick = fn; return b; }
  function showError(msg) { const e = $("plusError"); e.textContent = msg; e.classList.toggle("hidden", !msg); }

  function updateCard() {
    const card = $("plusCard");
    if (!enabled()) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");
    $("plusSub").textContent = isPlus()
      ? (st.status === "trialing" ? "Prueba gratis activa" : "Plus activo")
      : "Desbloquea " + feats.map(f => FEATURES[f].name).join(", ").replace(/, ([^,]*)$/, " y $1");
    card.classList.toggle("on", isPlus());
  }

  function openSheet(mode, feature, workingText, errorText) {
    const box = $("plusBody"); box.replaceChildren();
    const title = $("plusTitle");
    if (mode === "working") {
      title.textContent = "Mi Lista Plus";
      box.append(el("p", "plus-working", workingText || "Un momento…"));
    } else if (mode === "welcome") {
      title.textContent = "¡Ya tienes Plus! ⭐";
      box.append(el("p", "plus-lead", st.status === "trialing" ? "Tu prueba gratis ya empezó. Disfruta todas las funciones." : "Gracias por tu suscripción. Ya puedes usar todas las funciones."));
      box.append(codeBox());
      box.append(el("p", "plus-note", "Guarda este código (una captura de pantalla sirve). Si tienes la app instalada en la pantalla de inicio o cambias de teléfono, ábrela y toca Mi Lista Plus → Tengo un código."));
      box.append(btn("Empezar", "sh-primary", closeSheet));
    } else if (mode === "active") {
      title.textContent = "Mi Lista Plus ⭐";
      const s = el("div", "sh-status"); const d = el("span", "sh-dot"); d.dataset.s = "live";
      s.append(d, el("span", "", (st.status === "trialing" ? "Prueba gratis activa" : "Plus activo") + " · se renueva o vence el " + fmtDate(st.until - 3 * 86400)));
      box.append(s, codeBox());
      box.append(btn("Administrar suscripción", "sh-primary", manage));
      if (CFG.supportEmail) box.append(el("p", "plus-note", "¿Dudas? Escríbenos a " + CFG.supportEmail));
      box.append(btn("Cerrar", "sh-ghost", closeSheet));
    } else { // paywall
      title.textContent = "Mi Lista Plus ⭐";
      box.append(el("p", "plus-lead", feature ? FEATURES[feature].name + " es parte de Plus." : "Desbloquea todo lo que hace más fácil tu súper."));
      const ul = el("ul", "plus-feats");
      feats.forEach(f => { const li = el("li"); li.append(el("b", "", FEATURES[f].name), el("span", "", FEATURES[f].desc)); ul.append(li); });
      box.append(ul);
      const plans = el("div", "plus-plans");
      [["yearly", CFG.yearly], ["monthly", CFG.monthly]].forEach(([k, p]) => {
        if (!p || !p.link) return;
        const b = btn("", "plus-plan" + (k === "yearly" ? " best" : ""), () => { location.href = p.link; });
        b.append(el("b", "", p.label || (k === "yearly" ? "Plan anual" : "Plan mensual")));
        if (p.price) b.append(el("span", "", p.price));
        if (p.note) b.append(el("em", "", p.note));
        plans.append(b);
      });
      if (!plans.children.length) plans.append(el("p", "plus-note", "Los planes todavía no están disponibles."));
      box.append(plans);
      if (CFG.trialDays > 0) box.append(el("p", "plus-trial", CFG.trialDays + " días gratis para probar. Se renueva automáticamente y puedes cancelar cuando quieras."));
      else box.append(el("p", "plus-trial", "Se renueva automáticamente y puedes cancelar cuando quieras."));
      const err = el("p", "pc-error" + (errorText ? "" : " hidden"), errorText || ""); err.id = "plusError"; box.append(err);
      const join = el("div", "sh-join");
      const lbl = el("label", "", "¿Ya pagaste? Escribe tu código"); lbl.htmlFor = "plusCodeIn";
      const row = el("div", "sh-join-row");
      const inp = el("input"); inp.id = "plusCodeIn"; inp.type = "text"; inp.placeholder = "ABCD-EFGH-JKLM"; inp.maxLength = 16; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "characters");
      inp.addEventListener("keydown", e => { if (e.key === "Enter") restore(inp.value); });
      row.append(inp, btn("Usar código", "", () => restore(inp.value)));
      join.append(lbl, row); box.append(join);
      box.append(btn("Ahora no", "sh-ghost", closeSheet));
      if (errorText) showError(errorText);
    }
    if (mode === "active" && errorText) box.insertBefore(el("p", "pc-error", errorText), box.firstChild);
    $("plusSheet").classList.remove("hidden");
  }
  function codeBox() {
    const c = el("div", "sh-code");
    c.append(el("small", "", "Tu código de Plus"), el("b", "", pretty(st.code)));
    const copy = btn("Copiar código", "plus-copy", async () => {
      try { await navigator.clipboard.writeText(pretty(st.code)); copy.textContent = "Copiado ✓"; } catch { copy.textContent = pretty(st.code); }
    });
    c.append(copy);
    return c;
  }
  function closeSheet() { $("plusSheet").classList.add("hidden"); }
  $("plusSheet").addEventListener("click", e => { if (e.target === $("plusSheet")) closeSheet(); });
  $("plusCard").onclick = () => openSheet(isPlus() ? "active" : "paywall");

  /* ---------- inicio ---------- */
  window.MiListaPlus = { isPlus, locked, open: () => openSheet(isPlus() ? "active" : "paywall") };
  updateCard();
  if (!enabled()) return;
  const params = new URLSearchParams(location.search);
  const session = params.get("plus_session");
  const back = params.get("plus");
  if (session || back) history.replaceState(null, "", location.pathname);
  if (session) verifySession(session);
  else if (back) refresh(true).then(() => { if (isPlus()) openSheet("active"); });
  else refresh(false);
  // Si una función de Plus se abrió sola (por ejemplo desde un aviso) y está bloqueada, se muestra Plus.
  window.addEventListener("load", () => {
    if (locked("freezer") && !$("freezerView").classList.contains("hidden")) { $("fzBack").click(); openSheet("paywall", "freezer"); }
    if (locked("compras") && !$("comprasView").classList.contains("hidden")) { $("pcBack").click(); openSheet("paywall", "compras"); }
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(false); });
})();
