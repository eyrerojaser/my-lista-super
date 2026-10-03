/* Lector de códigos de barras con la cámara.
   Usa el lector nativo del teléfono (BarcodeDetector) cuando existe
   —Chrome en Android— y ZXing en los demás, como Safari en iPhone. */
(function () {
  const FORMATS_NATIVE = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"];
  let zxingPromise = null;

  function loadZXing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxingPromise) {
      zxingPromise = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "vendor/zxing.min.js";
        s.onload = () => (window.ZXing ? resolve(window.ZXing) : reject(new Error("zxing")));
        s.onerror = () => { zxingPromise = null; reject(new Error("zxing")); };
        document.head.appendChild(s);
      });
    }
    return zxingPromise;
  }

  async function nativeDetector() {
    if (!("BarcodeDetector" in window)) return null;
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = FORMATS_NATIVE.filter(f => supported.includes(f));
      if (!formats.includes("ean_13")) return null;
      return new window.BarcodeDetector({ formats });
    } catch { return null; }
  }

  // Verifica el dígito de control de EAN-13 / EAN-8 / UPC-A para descartar lecturas falsas.
  function validRetail(code) {
    if (!/^\d+$/.test(code)) return true; // Code 128 alfanumérico: se acepta tal cual
    if (![8, 12, 13, 14].includes(code.length)) return code.length >= 6;
    const digits = code.split("").map(Number);
    const check = digits.pop();
    let sum = 0;
    digits.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
    return (10 - (sum % 10)) % 10 === check;
  }

  // UPC-E y UPC-A se normalizan a 13 dígitos para que coincidan con la base de datos.
  function normalize(code) {
    code = String(code).trim();
    if (/^\d{12}$/.test(code)) return "0" + code;
    return code;
  }

  class Scanner {
    constructor(video) {
      this.video = video;
      this.stream = null;
      this.running = false;
      this.timer = null;
      this.engine = null;
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
      this.lastRaw = ""; this.lastRawAt = 0;
    }

    async start(onCode) {
      this.onCode = onCode;
      if (!window.isSecureContext) throw Object.assign(new Error("insecure"), { name: "InsecureContext" });
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("nocam"), { name: "NotSupportedError" });

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      this.video.srcObject = this.stream;
      await this.video.play().catch(() => {});

      // Enfoque continuo cuando el teléfono lo permite.
      const track = this.track();
      try {
        const caps = track.getCapabilities ? track.getCapabilities() : {};
        if (caps.focusMode && caps.focusMode.includes("continuous")) {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
        }
      } catch {}

      const native = await nativeDetector();
      if (native) {
        this.engine = { kind: "native", detector: native };
      } else {
        const Z = await loadZXing();
        const hints = new Map();
        hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
          Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A,
          Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.CODE_128,
        ]);
        hints.set(Z.DecodeHintType.TRY_HARDER, true);
        const reader = new Z.MultiFormatReader();
        reader.setHints(hints);
        this.engine = { kind: "zxing", Z, reader };
      }
      this.running = true;
      this.loop();
    }

    track() { return this.stream ? this.stream.getVideoTracks()[0] : null; }

    hasTorch() {
      const t = this.track();
      try { return !!(t && t.getCapabilities && t.getCapabilities().torch); } catch { return false; }
    }
    async setTorch(on) {
      const t = this.track();
      if (!t) return false;
      try { await t.applyConstraints({ advanced: [{ torch: !!on }] }); return true; } catch { return false; }
    }

    pause(ms) { this.pausedUntil = Date.now() + ms; }

    loop() {
      if (!this.running) return;
      const delay = this.engine.kind === "native" ? 110 : 160;
      this.timer = setTimeout(async () => {
        if (!this.running) return;
        if (this.video.readyState >= 2 && !(this.pausedUntil > Date.now())) {
          try {
            const raw = await this.detect();
            if (raw) this.confirm(raw);
          } catch {}
        }
        this.loop();
      }, delay);
    }

    // Exige dos lecturas iguales seguidas para evitar errores.
    confirm(raw) {
      const now = Date.now();
      if (raw === this.lastRaw && now - this.lastRawAt < 1200) {
        this.lastRaw = ""; this.lastRawAt = 0;
        const code = normalize(raw);
        if (validRetail(code) || validRetail(raw)) this.onCode(code);
      } else {
        this.lastRaw = raw; this.lastRawAt = now;
      }
    }

    async detect() {
      const v = this.video;
      const vw = v.videoWidth, vh = v.videoHeight;
      if (!vw || !vh) return null;

      if (this.engine.kind === "native") {
        const found = await this.engine.detector.detect(v);
        return found && found.length ? found[0].rawValue : null;
      }

      // ZXing: analiza la franja central, donde está el recuadro.
      const cropW = Math.round(vw * 0.86), cropH = Math.round(vh * 0.42);
      const sx = Math.round((vw - cropW) / 2), sy = Math.round((vh - cropH) / 2);
      const scale = Math.min(1, 960 / cropW);
      const cw = Math.round(cropW * scale), ch = Math.round(cropH * scale);
      if (this.canvas.width !== cw) this.canvas.width = cw;
      if (this.canvas.height !== ch) this.canvas.height = ch;
      this.ctx.drawImage(v, sx, sy, cropW, cropH, 0, 0, cw, ch);
      const { Z, reader } = this.engine;
      try {
        const src = new Z.HTMLCanvasElementLuminanceSource(this.canvas);
        const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(src));
        const res = reader.decodeWithState(bmp);
        return res ? res.getText() : null;
      } catch { return null; } finally { reader.reset(); }
    }

    stop() {
      this.running = false;
      clearTimeout(this.timer);
      if (this.stream) this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
      this.video.srcObject = null;
    }
  }

  window.BarcodeScanner = Scanner;
  window.BarcodeScanner.preload = () => { if (!("BarcodeDetector" in window)) loadZXing().catch(() => {}); };
})();
