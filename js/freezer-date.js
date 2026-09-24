/* Freezer Scan: lectura de fechas impresas.
   Usa Tesseract (reconocimiento de texto) incluido en la app, sin internet.
   Este archivo es independiente del escáner de Mi lista. */
(function (root) {
  const MONTHS = {
    JAN: 1, ENE: 1, FEB: 2, MAR: 3, APR: 4, ABR: 4, MAY: 5, JUN: 6, JUL: 7,
    AUG: 8, AGO: 8, SEP: 9, SEPT: 9, SET: 9, OCT: 10, NOV: 11, DEC: 12, DIC: 12,
  };
  const MON = "(JAN|ENE|FEB|MAR|APR|ABR|MAY|JUN|JUL|AUG|AGO|SEPT|SEP|SET|OCT|NOV|DEC|DIC)";
  const KEYWORD = /(EXP|BEST|USE|BB|BBE|CAD|VENC|FREEZE|SELL|CONSUM|ENJOY)/;

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

  // Devuelve todas las fechas encontradas: [{date:"YYYY-MM-DD", index, keyword}]
  function findDates(text, now) {
    const t = normalize(text);
    const out = [];
    const push = (date, idx, monthOnly) => {
      if (!date) return;
      const before = t.slice(Math.max(0, idx - 14), idx);
      out.push({ date, index: idx, keyword: KEYWORD.test(before), monthOnly: !!monthOnly });
    };
    let m;
    // 2026-12-15 · 2026/12/15
    const r1 = /\b(20\d{2})[\/\-. ](\d{1,2})[\/\-. ](\d{1,2})\b/g;
    while ((m = r1.exec(t))) push(valid(+m[1], +m[2], +m[3], now), m.index);
    // 12/15/2026 · 15/12/26 · 12-15-26 · 15.12.2026
    const r2 = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4}|\d{2})\b/g;
    while ((m = r2.exec(t))) {
      const a = +m[1], b = +m[2], y = fullYear(m[3]);
      // En EE. UU. se usa mes/día; si el primero pasa de 12 es día/mes.
      push(a > 12 ? valid(y, b, a, now) : (valid(y, a, b, now) || valid(y, b, a, now)), m.index);
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

  root.FreezerDate = { findDates, pickDate, normalize };
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
  function getWorker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        const T = await loadTesseract();
        const w = await T.createWorker("eng", 1, {
          workerPath: abs("vendor/tesseract/worker.min.js"),
          corePath: abs("vendor/tesseract/"),
          langPath: abs("vendor/tesseract/"),
          gzip: true,
        });
        await w.setParameters({
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/-.:, ",
          tessedit_pageseg_mode: "6",
        });
        return w;
      })().catch(e => { workerPromise = null; throw e; });
    }
    return workerPromise;
  }

  class DateReader {
    constructor(video, windowEl) {
      this.video = video; this.win = windowEl;
      this.stream = null; this.running = false; this.frame = 0;
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    }
    async start(onDate, onStatus) {
      this.onDate = onDate; this.onStatus = onStatus || (() => {});
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
      if (!this.running) return;
      this.onStatus("reading");
      this.loop();
    }
    hasTorch() {
      const t = this.stream && this.stream.getVideoTracks()[0];
      try { return !!(t && t.getCapabilities && t.getCapabilities().torch); } catch { return false; }
    }
    async setTorch(on) {
      const t = this.stream && this.stream.getVideoTracks()[0];
      try { await t.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch { return false; }
    }
    pause(on) { this.paused = on; if (!on && this.running && !this.busy) this.loop(); }
    loop() {
      clearTimeout(this.timer);
      if (!this.running || this.paused) return;
      this.timer = setTimeout(async () => {
        if (!this.running || this.paused) return;
        this.busy = true;
        try {
          const text = await this.read();
          const date = text ? FreezerDate.pickDate(text) : null;
          if (date && this.running && !this.paused) { this.paused = true; this.onDate(date, text); }
        } catch {}
        this.busy = false;
        this.loop();
      }, 350);
    }
    // Recorta lo que se ve dentro del recuadro y lo prepara para leer mejor.
    grab(variant) {
      const v = this.video, vw = v.videoWidth, vh = v.videoHeight;
      if (!vw || !vh) return null;
      const er = v.getBoundingClientRect(), wr = this.win.getBoundingClientRect();
      const scale = Math.max(er.width / vw, er.height / vh);
      const offX = (er.width - vw * scale) / 2, offY = (er.height - vh * scale) / 2;
      let sx = (wr.left - er.left - offX) / scale, sy = (wr.top - er.top - offY) / scale;
      let sw = wr.width / scale, sh = wr.height / scale;
      // Se lee un poco más allá del recuadro por si la fecha no cabe completa.
      sx -= sw * 0.12; sw *= 1.24; sy -= sh * 0.15; sh *= 1.3;
      sx = Math.max(0, sx); sy = Math.max(0, sy); sw = Math.min(vw - sx, sw); sh = Math.min(vh - sy, sh);
      const target = 1400;
      const k = target / sw;
      const cw = Math.round(sw * k), ch = Math.round(sh * k);
      this.canvas.width = cw; this.canvas.height = ch;
      const ctx = this.ctx;
      ctx.filter = variant === 1 ? "grayscale(1) blur(1.6px) contrast(1.6)" : "grayscale(1) contrast(1.35)";
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, cw, ch);
      ctx.filter = "none";
      const img = ctx.getImageData(0, 0, cw, ch), d = img.data;
      // Estira el contraste y, en la variante 1, convierte a blanco y negro (une los puntos de la tinta).
      let min = 255, max = 0;
      for (let i = 0; i < d.length; i += 16) { const g = d[i]; if (g < min) min = g; if (g > max) max = g; }
      const range = Math.max(1, max - min);
      let dark = 0;
      const thr = variant === 1 ? otsu(d) : -1;
      for (let i = 0; i < d.length; i += 4) {
        let g = ((d[i] - min) * 255) / range;
        if (thr >= 0) g = d[i] > thr ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = g;
        if (g < 128) dark++;
      }
      // Si el texto es claro sobre fondo oscuro, se invierte.
      if (dark > (d.length / 4) * 0.55) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
      ctx.putImageData(img, 0, 0);
      return this.canvas;
    }
    async read() {
      const c = this.grab(this.frame++ % 2);
      if (!c) return "";
      const { data } = await this.worker.recognize(c);
      return data && data.text ? data.text : "";
    }
    stop() {
      this.running = false; this.paused = false;
      clearTimeout(this.timer);
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = null; this.video.srcObject = null;
    }
  }
  function otsu(d) {
    const hist = new Array(256).fill(0); let n = 0;
    for (let i = 0; i < d.length; i += 4) { hist[d[i]]++; n++; }
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB, mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = t; }
    }
    return thr;
  }
  window.FreezerDateReader = DateReader;
  window.FreezerDateReader.warmup = () => { getWorker().catch(() => {}); };
})();
