/* Cuentas: para usar la app hay que registrarse (nombre, correo y contraseña).
   La sesión se guarda en el teléfono; la app funciona sin señal una vez iniciada la sesión. */
(function () {
  const CFG = window.PLUS_CONFIG || {};
  const KEY = "account-v1";
  const $ = id => document.getElementById(id);
  let acct = null;
  try { acct = JSON.parse(localStorage.getItem(KEY)); } catch {}
  const listeners = [];
  const save = () => { try { acct ? localStorage.setItem(KEY, JSON.stringify(acct)) : localStorage.removeItem(KEY); } catch {} listeners.forEach(f => f(acct)); };

  async function api(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: d };
  }

  /* ---------- pantalla de registro / inicio de sesión ---------- */
  let mode = "register"; // register | login | forgot | reset
  let resetEmail = "";
  function show() { render(); $("authScreen").classList.remove("hidden"); document.body.style.overflow = "hidden"; }
  function hide() { $("authScreen").classList.add("hidden"); document.body.style.overflow = ""; }
  function field(id, label, type, extra) {
    const w = document.createElement("label"); w.className = "auth-field";
    const s = document.createElement("span"); s.textContent = label;
    const i = document.createElement("input"); i.id = id; i.type = type; Object.assign(i, extra || {});
    w.append(s, i); return w;
  }
  function render() {
    const f = $("authForm"); f.replaceChildren();
    const t = $("authTitle"), sub = $("authSub");
    $("authError").classList.add("hidden");
    if (mode === "register") {
      t.textContent = "Crea tu cuenta";
      sub.textContent = CFG.enabled && CFG.foundersLimit
        ? "Las primeras " + CFG.foundersLimit + " personas que se registren usan la app gratis."
        : "Regístrate para empezar a usar tu lista del súper.";
      f.append(field("auName", "Nombre", "text", { autocomplete: "name", required: true, maxLength: 60 }),
        field("auEmail", "Correo", "email", { autocomplete: "email", required: true, inputMode: "email" }),
        field("auPass", "Contraseña (mínimo 8 caracteres)", "password", { autocomplete: "new-password", required: true, minLength: 8 }));
      $("authSubmit").textContent = "Crear cuenta";
      $("authAlt").textContent = "Ya tengo cuenta: iniciar sesión";
      $("authForgot").classList.add("hidden");
    } else if (mode === "login") {
      t.textContent = "Inicia sesión"; sub.textContent = "Entra con el correo y la contraseña de tu cuenta.";
      f.append(field("auEmail", "Correo", "email", { autocomplete: "email", required: true, inputMode: "email" }),
        field("auPass", "Contraseña", "password", { autocomplete: "current-password", required: true }));
      $("authSubmit").textContent = "Entrar";
      $("authAlt").textContent = "No tengo cuenta: crear una";
      $("authForgot").classList.remove("hidden");
    } else if (mode === "forgot") {
      t.textContent = "¿Olvidaste tu contraseña?"; sub.textContent = "Escribe tu correo y te damos un código de 6 números para poner una nueva.";
      f.append(field("auEmail", "Correo", "email", { autocomplete: "email", required: true, inputMode: "email" }));
      $("authSubmit").textContent = "Pedir código";
      $("authAlt").textContent = "Volver a iniciar sesión";
      $("authForgot").classList.add("hidden");
    } else if (mode === "reset") {
      t.textContent = "Nueva contraseña";
      f.append(field("auCode", "Código de 6 números", "text", { inputMode: "numeric", autocomplete: "one-time-code", maxLength: 6, required: true }),
        field("auPass", "Contraseña nueva (mínimo 8 caracteres)", "password", { autocomplete: "new-password", required: true, minLength: 8 }));
      $("authSubmit").textContent = "Guardar y entrar";
      $("authAlt").textContent = "Volver a iniciar sesión";
      $("authForgot").classList.add("hidden");
    }
    setTimeout(() => { const first = f.querySelector("input"); if (first) first.focus(); }, 60);
  }
  function error(msg) { const e = $("authError"); e.textContent = msg; e.classList.remove("hidden"); }
  function busy(on) { $("authSubmit").disabled = on; $("authSubmit").classList.toggle("busy", on); }
  const val = id => ($(id) ? $(id).value : "");

  $("authFormWrap").onsubmit = async e => {
    e.preventDefault();
    if (!navigator.onLine) { error("Necesitas internet para entrar a tu cuenta."); return; }
    busy(true);
    try {
      let r;
      if (mode === "register") {
        if (!val("auName").trim()) { error("Escribe tu nombre."); return; }
        if (val("auPass").length < 8) { error("La contraseña debe tener al menos 8 caracteres."); return; }
        r = await api("/api/auth-register", { name: val("auName"), email: val("auEmail"), password: val("auPass") });
      } else if (mode === "login") {
        r = await api("/api/auth-login", { email: val("auEmail"), password: val("auPass") });
      } else if (mode === "forgot") {
        resetEmail = val("auEmail").trim();
        r = await api("/api/auth-reset", { step: "request", email: resetEmail });
        if (r.ok) {
          mode = "reset"; render();
          $("authSub").textContent = r.data.byEmail
            ? "Te enviamos un código a " + resetEmail + ". Revisa también la carpeta de spam."
            : "Pide tu código a soporte" + (CFG.supportEmail ? " (" + CFG.supportEmail + ")" : "") + " y escríbelo aquí. Vence en 30 minutos.";
          return;
        }
      } else if (mode === "reset") {
        r = await api("/api/auth-reset", { step: "confirm", email: resetEmail, code: val("auCode"), password: val("auPass") });
      }
      if (!r.ok) { error(r.data.error || "Algo salió mal. Intenta de nuevo."); return; }
      acct = { token: r.data.token, user: r.data.user, checked: Date.now() }; save();
      hide();
      if (window.MiLista) window.MiLista.toast(r.data.user.founder && mode === "register" ? "¡Bienvenida! Eres de las primeras: tienes Plus gratis ⭐" : "Hola, " + r.data.user.name);
    } catch { error("Sin conexión. Intenta de nuevo."); }
    finally { busy(false); }
  };
  $("authAlt").onclick = () => { mode = mode === "register" ? "login" : mode === "login" ? "register" : "login"; render(); };
  $("authForgot").onclick = () => { mode = "forgot"; render(); };

  /* ---------- sesión ---------- */
  async function refresh() {
    if (!acct || !navigator.onLine) return;
    if (acct.checked && Date.now() - acct.checked < 24 * 3600 * 1000) return;
    try {
      const r = await api("/api/auth-me", { token: acct.token });
      if (r.ok) { acct.user = r.data.user; acct.checked = Date.now(); save(); }
      else if (r.status === 401) { logout(true); }
    } catch {}
  }
  function logout(expired) {
    acct = null; save();
    mode = "login"; show();
    if (expired) error("Tu sesión venció. Vuelve a entrar.");
  }

  window.MiCuenta = {
    required: () => !!CFG.authRequired,
    get: () => acct,
    token: () => acct && acct.token,
    user: () => acct && acct.user,
    logout: () => logout(false),
    onChange: f => listeners.push(f),
  };
  if (CFG.authRequired && !acct) { mode = "register"; show(); }
  else refresh();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
