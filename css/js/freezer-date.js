/* Freezer Scan: lectura de fechas impresas.
   Usa Tesseract (reconocimiento de texto) incluido en la app, sin internet.
   Este archivo es independiente del escáner de Mi lista. */
(function (root) {
  const MONTHS = {
    JAN: 1, ENE: 1, FEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6, JUL: 7,
    AUG: 8, AGO: 8, SEP: 9, SEPT: 9, SET: 9, OCT: 10, NOV: 11, DEC: 12, DIC: 12,
  };
  const MON = "(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEPT|SEP|SET|OCT|NOV|DEC|DIC)";
  const KEYWORD = /(EXP|BEST|USE|BB|BBE|CAD|VENC|FREEZE|SELL|CONSUM|ENJOY|BY)/;
  // Tipos de fecha (acepta errores típicos de lectura: 3 por E, 5 por S, 0 por O).
  const TYPES = [
    ["freeze", /FR[E3]{1,2}Z[E3]?\s*(BY|8Y|B\/)?/],
    ["sell", /[S5][E3]L{1,2}\s*(BY|8Y|B\/)/],
    ["use", /U[S5][E3]\s*(BY|8Y|B\/)|U[S5][E3]\s*B[E3]F[O0]R[E3]/],
    ["best", /B[E3][S5]T\s*(BY|8Y|B\/|B[E3]F[O0]R[E3]|IF\s*U[S5][E3]D)|\bBB[E]?\b|\bBBD\b/],
    ["exp", /\bEXP|\bCAD|VENC|CONSUM/],
  ];
  const TYPE_LABEL = { freeze: "Freeze By", sell: "Sell By", use: "Use By", best: "Best By", exp: "Expira", date: "Fecha" };
  function typeBefore(t, idx) {
    const before = t.slice(Math.max(0, idx - 24), idx);
    let best = null, pos = -1;
    for (const [type, re] of TYPES) {
      const g = new RegExp(re.source, "g"); let m;
      while ((m = g.exec(before))) if (m.index >= pos) { pos = m.index; best = type; }
    }
    return best;
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { return y + "-" + pad(m) + "-" + pad(d); }
  function daysInMonth(y, m) { return new Date(y, m, 0).getDate(); }
  function fullYear(y) {
    y = parseInt(y, 10);
    if (y < 100) y += 2000;
    return y;
  }
  function valid(y, m, d, now) {
    if (!(m >= 1 && m <= 12)) return null;
    if (!(d >= 1 && d <= daysInMonth(y, m))) return null;
    const t = new Date(y, m - 1, d).getTime();
    const today = now || Date.now();
    // Se aceptan fechas de hasta ~1 año atrás (ya vencidas) y hasta 6 años adelante.
    if (t < today - 400 * 864e5 || t > today + 6 * 366 * 864e5) return null;
    return iso(y, m, d);
  }

  // Corrige confusiones típicas del lector dentro de grupos de números: O→0, I/L→1, S→5, B→8, Z→2.
  function normalize(text) {
    let t = String(text || "").toUpperCase()
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/[|\\]/g, "/")
      .replace(/[,;]/g, " ");
    t = t.replace(/[0-9OILSBZ]{1,4}(?=[\/\-.][0-9OILSBZ])|(?<=[\/\-.])[0-9OILSBZ]{1,4}/g, m =>
      m.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8").replace(/Z/g, "2"));
    t = t.replace(/\b[0-9OIL]{1,2}(?=\s?[A-Z]{3}\s?[0-9OIL]{2,4}\b)/g, m => m.replace(/O/g, "0").replace(/[IL]/g, "1"));
    return t.replace(/[ \t]+/g, " ");
  }

  function mdY(a, b, y, now) {
    // En EE. UU. se usa mes/día; si el primero pasa de 12 es día/mes.
    a = +a; b = +b; y = fullYear(y);
    return a > 12 ? valid(y, b, a, now) : (valid(y, a, b, now) || valid(y, b, a, now));
  }
  // Las fechas de puntitos a veces se leen con 8 o 6 en lugar de 0 (18/82/26 → 10/02/26).
  let lastFuzzy = false;
  function numericDate(a, b, y, now) {
    lastFuzzy = false;
    const direct = mdY(a, b, y, now);
    if (direct) return direct;
    lastFuzzy = true;
    const variants = str => {
      const out = new Set([str]);
      for (let i = 0; i < str.length; i++) if (str[i] === "8" || str[i] === "6") {
        for (const v of Array.from(out)) out.add(v.slice(0, i) + "0" + v.slice(i + 1));
      }
      return Array.from(out).sort((p, q) => diff(str, p) - diff(str, q));
    };
    const diff = (p, q) => { let n = 0; for (let i = 0; i < p.length; i++) if (p[i] !== q[i]) n++; return n; };
    // Año de 2 cifras mal leído (20 → 26/28): solo se prueba si el año original no sirve.
    const YFIX = { "0": ["6", "8"], "8": ["6", "0"], "6": ["8"], "3": ["8"], "5": ["6"], "4": ["6"], "9": ["8"] };
    const years = [y];
    if (y.length === 2) for (const r of YFIX[y[1]] || []) years.push(y[0] + r);
    // Primero mes/día (formato de EE. UU.); solo si no hay ninguna, día/mes.
    for (const order of ["md", "dm"]) {
      let best = null, bestCost = 99;
      years.forEach((yy, yi) => {
        for (const aa of variants(a)) for (const bb of variants(b)) {
          const cost = diff(a, aa) + diff(b, bb) + (yi ? 1 : 0);
          if (cost >= bestCost) continue;
          const d = order === "md" ? valid(fullYear(yy), +aa, +bb, now) : valid(fullYear(yy), +bb, +aa, now);
          if (d) { best = d; bestCost = cost; }
        }
      });
      if (best) return best;
    }
    return null;
  }

  // Devuelve todas las fechas encontradas: [{date:"YYYY-MM-DD", index, keyword}]
  function findDates(text, now) {
    const t = normalize(text);
    const out = [];
    const push = (date, idx, monthOnly, fuzzy) => {
      if (!date) return;
      const before = t.slice(Math.max(0, idx - 14), idx);
      const type = typeBefore(t, idx);
      out.push({ date, index: idx, keyword: !!type || KEYWORD.test(before), type: type || "date", monthOnly: !!monthOnly, fuzzy: !!fuzzy });
    };
    let m;
    // 2026-12-15 · 2026/12/15
    const r1 = /\b(20\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})\b/g;
    while ((m = r1.exec(t))) push(valid(+m[1], +m[2], +m[3], now), m.index);
    // 12/15/2026 · 15/12/26 · 12-15-26 · 15.12.2026
    const r2 = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})\b/g;
    while ((m = r2.exec(t))) {
      push(numericDate(m[1], m[2], m[3], now), m.index, false, lastFuzzy);
    }
    // Las diagonales a veces se leen como 7 o 1: 18762728 → 18/62/28.
    if (!out.length) {
      const r2b = /\b(\d{2})[71](\d{2})[71](\d{2}|\d{4})\b/g;
      while ((m = r2b.exec(t))) { const d = numericDate(m[1], m[2], m[3], now); push(d, m.index, false, true); }
    }
    // 15 DEC 2026 · 15DEC26 · 15-DIC-26
    const r3 = new RegExp("\\b(\\d{1,2})[\\s\\-./]?" + MON + "[\\s\\-./]?(\\d{4}|\\d{2})\\b", "g");
    while ((m = r3.exec(t))) push(valid(fullYear(m[3]), MONTHS[m[2]], +m[1], now), m.index);
    // DEC 15 2026 · DEC 15, 26
    const r4 = new RegExp("\\b" + MON + "[\\s\\-./]?(\\d{1,2})[\\s\\-./]{1,2}(\\d{4}|\\d{2})\\b", "g");
    while ((m = r4.exec(t))) push(valid(fullYear(m[3]), MONTHS[m[1]], +m[2], now), m.index);
    // DEC152026 (todo junto)
    const r4b = new RegExp("\\b" + MON + "(\\d{2})(20\\d{2})\\b", "g");
    while ((m = r4b.exec(t))) push(valid(+m[3], MONTHS[m[1]], +m[2], now), m.index);
    // DEC 2026 · DEC26 (solo mes: se usa el último día)
    const r5 = new RegExp("\\b" + MON + "[\\s\\-./]?(20\\d{2}|\\d{2})\\b(?![\\s\\-./]?\\d)", "g");
    while ((m = r5.exec(t))) {
      const y = fullYear(m[2]), mo = MONTHS[m[1]];
      push(valid(y, mo, daysInMonth(y, mo), now), m.index, true);
    }
    // 12/2026 (solo mes)
    const r6 = /\b(\d{1,2})[\/\-.](20\d{2})\b/g;
    while ((m = r6.exec(t))) {
      const y = +m[2], mo = +m[1];
      if (mo >= 1 && mo <= 12) push(valid(y, mo, daysInMonth(y, mo), now), m.index, true);
    }
    return out;
  }

  // Igual que pickDate pero también dice qué tipo de fecha es (Freeze By, Sell By, Use By, Best By).
  function pickDateInfo(text, now) {
    const all = findDates(text, now);
    if (!all.length) return null;
    const full = all.filter(x => !x.monthOnly);
    const base = full.length ? full : all;
    const withKw = base.filter(x => x.keyword);
    const pool = withKw.length ? withKw : base;
    const typed = pool.filter(x => x.type !== "date");
    const win = (typed.length ? typed : pool).slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    // Si no hay tipo junto a la fecha, se busca en todo el texto (a veces va en otra línea).
    let type = win.type;
    if (type === "date") {
      const t = normalize(text);
      for (const [k, re] of TYPES) if (re.test(t)) { type = k; break; }
    }
    return { date: win.date, type, label: TYPE_LABEL[type], fuzzy: !!win.fuzzy };
  }

  // Elige la fecha más probable: la que va después de EXP/BEST BY/USE BY; si no, la más lejana.
  function pickDate(text, now) {
    const all = findDates(text, now);
    if (!all.length) return null;
    // Una fecha completa (con día) gana sobre una que solo trae mes y año.
    const full = all.filter(x => !x.monthOnly);
    const base = full.length ? full : all;
    const withKw = base.filter(x => x.keyword);
    const pool = withKw.length ? withKw : base;
    return pool.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0].date;
  }

  root.FreezerDate = { findDates, pickDate, pickDateInfo, normalize, TYPE_LABEL };
})(typeof window !== "undefined" ? window : globalThis);

/* Lector de fecha con la cámara (segundo escáner, solo para Freezer Scan). */
(function () {
  if (typeof window === "undefined") return;
  let tessPromise = null, workerPromise = null;
  const abs = p => new URL(p, location.href).href;

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tessPromise) {
      tessPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "vendor/tesseract/tesseract.min.js";
        s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("tesseract")));
        s.onerror = () => { tessPromise = null; reject(new Error("tesseract")); };
        document.head.appendChild(s);
      });
    }
    return tessPromise;
  }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  }
  function getWorker() {
    if (!workerPromise) {
      workerPromise = withTimeout((async () => {
        const T = await loadTesseract();
        const w = await T.createWorker("eng", 1, {
          workerPath: abs("vendor/tesseract/worker.min.js"),
          corePath: abs("vendor/tesseract/"),
          langPath: abs("vendor/tesseract/"),
          gzip: false,          // el archivo va sin comprimir para que ningún servidor lo altere
          cacheMethod: "none",  // el service worker ya lo guarda; así nunca queda una copia dañada
        });
        await w.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-.:, ",
          tessedit_pageseg_mode: "6",
          user_defined_dpi: "300",
        });
        return w;
      })(), 45000).catch(e => { workerPromise = null; throw e; });
    }
    return workerPromise;
  }

  // Escala de grises, contraste y (opcional) blanco y negro, hecho a mano para que funcione igual en iPhone.
  function prepare(ctx, w, h, variant) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const n = d.length / 4, gray = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) gray[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    let src = gray;
    // Variante = cuántas veces se suaviza (une los puntitos de la tinta) antes de pasar a blanco y negro; 0 = solo contraste.
    const passes = variant;
    for (let p = 0; p < passes; p++) {
      const out = new Uint8ClampedArray(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let sum = 0, c = 0;
        for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; sum += src[yy * w + xx]; c++; } }
        out[y * w + x] = sum / c;
      }
      src = out;
    }
    const hist = new Uint32Array(256); for (let j = 0; j < n; j++) hist[src[j]]++;
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * 0.02) { lo = v; break; } }
    acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * 0.02) { hi = v; break; } }
    const range = Math.max(1, hi - lo);
    let thr = -1;
    if (variant >= 1) thr = otsu(src, n);
    let dark = 0;
    for (let j = 0, i = 0; j < n; j++, i += 4) {
      let g = thr >= 0 ? (src[j] > thr ? 255 : 0) : Math.max(0, Math.min(255, ((src[j] - lo) * 255) / range));
      d[i] = d[i + 1] = d[i + 2] = g; d[i + 3] = 255;
      if (g < 110) dark++;
    }
    if (dark > n * 0.55) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
    ctx.putImageData(img, 0, 0);
  }
  function otsu(src, n) {
    const hist = new Array(256).fill(0); for (let j = 0; j < n; j++) hist[src[j]]++;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF, between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = t; }
    }
    return thr;
  }

  class DateReader {
    constructor(video, windowEl) {
      this.video = video; this.win = windowEl;
      this.stream = null; this.running = false; this.frame = 0; this.gen = 0;
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    async start(onDate, onStatus, onText) {
      this.onDate = onDate; this.onStatus = onStatus || (() => {}); this.onText = onText || (() => {});
      this.paused = false; this.busy = false; this.votes = {}; this.sinceFirst = 0;
      const gen = ++this.gen;
      if (!window.isSecureContext) throw Object.assign(new Error("insecure"), { name: "InsecureContext" });
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("nocam"), { name: "NotSupportedError" });
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      this.video.srcObject = this.stream;
      await this.video.play().catch(() => {});
      const track = this.stream.getVideoTracks()[0];
      try {
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.focusMode && caps.focusMode.includes("continuous")) await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
      } catch {}
      this.running = true;
      this.onStatus("loading");
      this.worker = await getWorker();
      if (!this.running || gen !== this.gen) return;
      this.onStatus("reading");
      this.loop(gen);
    }
    hasTorch() {
      const t = this.stream && this.stream.getVideoTracks()[0];
      try { return !!(t && t.getCapabilities && t.getCapabilities().torch); } catch { return false; }
    }
    async setTorch(on) {
      const t = this.stream && this.stream.getVideoTracks()[0];
      try { await t.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch { return false; }
    }
    pause(on) {
      this.paused = on;
      if (!on) { this.votes = {}; this.sinceFirst = 0; if (this.running && !this.busy) this.loop(this.gen); }
    }
    loop(gen) {
      clearTimeout(this.timer);
      if (!this.running || this.paused || gen !== this.gen) return;
      this.timer = setTimeout(async () => {
        if (!this.running || this.paused || gen !== this.gen) return;
        this.busy = true;
        try {
          const text = await this.read();
          if (gen !== this.gen) return;
          if (text && text.trim()) this.onText(text);
          const info = text ? FreezerDate.pickDateInfo(text) : null;
          // Se confirma cuando la misma fecha sale dos veces (o tras varias lecturas si solo salió una).
          if (info) {
            const v = this.votes[info.date] || (this.votes[info.date] = { n: 0, info });
            // Una lectura limpia vale más que una corregida; una fecha a más de 2 años es menos probable.
            const far = (new Date(info.date) - Date.now()) > 730 * 864e5;
            v.n += (info.fuzzy ? 1 : 2) * (far ? 0.5 : 1);
            if (info.type !== "date") v.info = Object.assign({}, info);
            this.sinceFirst = (this.sinceFirst || 0) + 1;
          } else if (this.sinceFirst) this.sinceFirst++;
          const ranked = Object.values(this.votes).sort((p, q) => q.n - p.n);
          const winner = ranked[0] && (ranked[0].n >= 3 || this.sinceFirst >= 6) ? ranked[0].info : null;
          if (winner && this.running && !this.paused) { this.paused = true; this.votes = {}; this.sinceFirst = 0; this.onDate(winner, text); }
        } catch {}
        finally { this.busy = false; }
        this.loop(gen);
      }, 250);
    }
    // Recorta lo que se ve dentro del recuadro (un poco más) a la resolución completa de la cámara.
    grab(variant) {
      const v = this.video, vw = v.videoWidth, vh = v.videoHeight;
      if (!vw || !vh) return null;
      const er = v.getBoundingClientRect(), wr = this.win.getBoundingClientRect();
      if (!er.width || !wr.width) return null;
      const scale = Math.max(er.width / vw, er.height / vh);
      const offX = (er.width - vw * scale) / 2, offY = (er.height - vh * scale) / 2;
      let sx = (wr.left - er.left - offX) / scale, sy = (wr.top - er.top - offY) / scale;
      let sw = wr.width / scale, sh = wr.height / scale;
      sx -= sw * 0.12; sw *= 1.24; sy -= sh * 0.25; sh *= 1.5;
      sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(vw - sx, sw); sh = Math.min(vh - sy, sh);
      // El texto necesita unos 30–40 px de alto para leerse bien.
      const k = Math.max(1.5, Math.min(2.5, 1400 / sw));
      const cw = Math.round(sw * k), ch = Math.round(sh * k);
      this.canvas.width = cw; this.canvas.height = ch;
      this.ctx.imageSmoothingQuality = "high";
      this.ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cw, ch);
      prepare(this.ctx, cw, ch, variant);
      return this.canvas;
    }
    async read() {
      const c = this.grab(1 + (this.frame++ % 3));
      if (!c) return "";
      const { data } = await this.worker.recognize(c);
      return data && data.text ? data.text : "";
    }
    stop() {
      this.running = false; this.paused = false; this.gen++;
      clearTimeout(this.timer);
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = null; this.video.srcObject = null;
    }
  }

  // Lee la fecha de una foto (más nítida que el video). Devuelve {date,type,label} o null.
  async function readPhoto(file) {
    const worker = await getWorker();
    const bmp = await loadImage(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const maxSide = 2200, k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let texts = [];
    for (const [variant, psm] of [[1, "11"], [2, "11"], [0, "6"]]) {
      ctx.putImageData(original, 0, 0);
      prepare(ctx, canvas.width, canvas.height, variant);
      await worker.setParameters({ tessedit_pageseg_mode: psm });
      const { data } = await worker.recognize(canvas);
      const text = (data && data.text) || "";
      texts.push(text);
      const info = FreezerDate.pickDateInfo(text);
      if (info) { await worker.setParameters({ tessedit_pageseg_mode: "6" }); return info; }
    }
    await worker.setParameters({ tessedit_pageseg_mode: "6" });
    return FreezerDate.pickDateInfo(texts.join("\n"));
  }
  async function loadImage(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch {} }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }

  window.FreezerDateReader = DateReader;
  window.FreezerDateReader.warmup = () => { getWorker().catch(() => {}); };
  window.FreezerDateReader.readPhoto = readPhoto;
  window.FreezerDateReader.loadImage = loadImage;
})();
