/* Mis Compras: lectura de recibos.
   ReceiptParser convierte el texto del recibo en tienda, fecha, productos y total.
   ReceiptOCR lee el texto de la foto con Tesseract (incluido en la app, funciona sin internet). */
(function (root) {
  const STORES = [
    ["H-E-B", /\bH[\s\-.]?E[\s\-.]?B\b|HEB\b/], ["Walmart", /WAL[\s\-*]?MART|WALMART|SAVE MONEY\.? LIVE BETTER/],
    ["Target", /\bTARGET\b/], ["Kroger", /\bKROGER\b/], ["Aldi", /\bALDI\b/], ["Costco", /\bCOSTCO\b/],
    ["Sam's Club", /SAM'?S\s*CLUB/], ["Fiesta Mart", /\bFIESTA\b/], ["Whole Foods", /WHOLE\s*FOODS/],
    ["Trader Joe's", /TRADER\s*JOE/], ["Randalls", /\bRANDALLS\b/], ["Tom Thumb", /TOM\s*THUMB/],
    ["Brookshire Brothers", /BROOKSHIRE\s*BROTHERS/], ["Brookshire's", /BROOKSHIRE/], ["Sprouts", /\bSPROUTS\b/],
    ["Dollar General", /DOLLAR\s*GENERAL/], ["Family Dollar", /FAMILY\s*DOLLAR/], ["Dollar Tree", /DOLLAR\s*TREE/],
    ["CVS", /\bCVS\b/], ["Walgreens", /WALGREENS/], ["Albertsons", /ALBERTSONS/], ["Safeway", /SAFEWAY/],
    ["Publix", /\bPUBLIX\b/], ["Lidl", /\bLIDL\b/], ["Save A Lot", /SAVE[\s\-]?A[\s\-]?LOT/], ["Food Town", /FOOD\s*TOWN/],
    ["El Rancho", /EL\s*RANCHO/], ["Cardenas", /CARDENAS/], ["La Michoacana", /MICHOACANA/], ["Joe V's", /JOE\s*V'?S/],
    ["Mi Tienda", /MI\s*TIENDA/], ["Central Market", /CENTRAL\s*MARKET/], ["Market Street", /MARKET\s*STREET/],
    ["United Supermarkets", /UNITED\s*SUPERMARKETS/], ["WinCo", /\bWINCO\b/], ["Food Lion", /FOOD\s*LION/],
    ["Meijer", /\bMEIJER\b/], ["Buc-ee's", /BUC[\s\-]?EE/],
  ];
  const TOTAL_RE = /\b(TOTAL|T0TAL|TOTAI|BALANCE\s*DUE|AMOUNT\s*DUE|AMT\s*DUE|TOTAL\s*DUE|GRAND\s*TOTAL|TOTAL\s*A\s*PAGAR|IMPORTE\s*TOTAL)\b/;
  const NOT_TOTAL_RE = /SUB|TAX|SAV|DISC|ITEMS|ITEM\s*COUNT|POINTS|QTY|CHANGE|CAMBIO|TOTAL\s*NUMBER|#\s*ITEMS|REWARD|YOU\s*SAVED|COUPON/;
  const SKIP_RE = /SUB\s*-?\s*TOTAL|SUBTOTAL|\bTAX\b|IMPUESTO|\bTOTAL\b|BALANCE|AMOUNT\s*DUE|\bCHANGE\b|CAMBIO|\bCASH\b|EFECTIVO|\bVISA\b|MASTER\s*CARD|\bAMEX\b|DISCOVER|\bDEBIT\b|CREDIT|\bEBT\b|TEND|PAYMENT|PAGO|APPROV|AUTH|\bREF\b|ACCOUNT|ACCT|CARD\s*#|YOU\s*SAVED|SAVINGS|POINTS|REWARD|\bITEMS?\s*(SOLD|COUNT)|TEL\b|PHONE|STORE\s*#|CASHIER|CAJER|TERMINAL|TRANS/;
  const PAY_RE = /\b(VISA|MASTER\s*CARD|MC|AMEX|DISCOVER|DEBIT|CREDIT|CASH|EBT|TEND|PAID|PAGADO)\b/;
  const TAX_RE = /\bTAX\b|IMPUESTO/;
  const SUBTOTAL_RE = /SUB\s*-?\s*TOTAL/;

  // Precio al final de la línea: 3.49 · $3.49 · 3,49 · 3.49 F · 3.49-  · -1.00
  const PRICE_END = /(-?)\s?\$?\s?(\d{1,4})(?:\s?[.,]\s?|\s)(\d{2})\s*(-)?\s*(?:[A-Z]{1,2}|\*|[A-Z]\s?[A-Z])?\s*$/;

  function cleanLine(l) {
    return String(l).replace(/[|]/g, " ").replace(/\s+/g, " ").trim();
  }
  function priceOf(line) {
    const m = line.toUpperCase().match(PRICE_END);
    if (!m) return null;
    const cents = parseInt(m[2], 10) * 100 + parseInt(m[3], 10);
    const neg = m[1] === "-" || m[4] === "-";
    return { cents: neg ? -cents : cents, index: m.index };
  }
  function cleanName(n) {
    n = n.replace(/\b\d{6,}\b/g, " ")               // códigos de producto (en cualquier parte)
      .replace(/^\s*\d{4,}\s+/, "")
      .replace(/(\s+[A-Z]){1,2}\s*$/, "")           // letras sueltas de impuesto al final (F, N, X)
      .replace(/\s+\d+\s*@\s*\$?\d+[.,]\d{2}.*$/, "") // "2 @ 1.99"
      .replace(/[^\p{L}\p{N}&'%/.,\- ]/gu, " ")
      .replace(/\s+/g, " ").trim();
    return n.replace(/^[\-.,/ ]+|[\-.,/ ]+$/g, "");
  }
  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  }

  function findStore(lines) {
    const head = lines.slice(0, 10).join(" \n ").toUpperCase();
    for (const [name, re] of STORES) if (re.test(head)) return name;
    const all = lines.join(" \n ").toUpperCase();
    for (const [name, re] of STORES) if (re.test(all)) return name;
    // Si no es una tienda conocida: la primera línea con letras que no sea dirección ni teléfono.
    for (const l of lines.slice(0, 6)) {
      const letters = (l.match(/\p{L}/gu) || []).length;
      if (letters >= 3 && letters / l.length > 0.6 && !/\d{3}[\s\-)]\d{3}/.test(l) && !/\b(ST|AVE|RD|BLVD|HWY|DR|LN|PKWY|TX|WELCOME|BIENVENID)\b/i.test(l))
        return titleCase(l.replace(/[^\p{L}\p{N}&' \-]/gu, "").trim()).slice(0, 40);
    }
    return "";
  }

  function findDate(text, today) {
    const FD = root.FreezerDate;
    if (!FD) return null;
    const t = today || new Date();
    const limit = new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).getTime();
    const found = FD.findDates(text, t.getTime()).filter(x => !x.monthOnly && new Date(x.date).getTime() <= limit && !x.fuzzy);
    if (found.length) return found.sort((a, b) => a.index - b.index)[0].date;
    const fuzzy = FD.findDates(text, t.getTime()).filter(x => !x.monthOnly && new Date(x.date).getTime() <= limit);
    return fuzzy.length ? fuzzy.sort((a, b) => a.index - b.index)[0].date : null;
  }

  function parse(text, today) {
    const lines = String(text || "").split(/\r?\n/).map(cleanLine).filter(Boolean);
    const store = findStore(lines);
    const date = findDate(lines.join("\n"), today);
    let total = null, subtotal = null, tax = 0, payment = null;
    let endOfItems = lines.length;
    const items = [];
    let pendingName = "";

    lines.forEach((line, i) => {
      const U = line.toUpperCase();
      const p = priceOf(line);
      if (SUBTOTAL_RE.test(U)) { if (p) subtotal = p.cents; endOfItems = Math.min(endOfItems, i); return; }
      if (TAX_RE.test(U) && !/TAXABLE/.test(U)) { if (p) tax += Math.max(0, p.cents); endOfItems = Math.min(endOfItems, i); return; }
      if (TOTAL_RE.test(U) && !NOT_TOTAL_RE.test(U)) {
        if (p && p.cents > 0 && (total === null || p.cents > total)) total = p.cents;
        endOfItems = Math.min(endOfItems, i); return;
      }
      if (PAY_RE.test(U) && p && p.cents > 0 && payment === null) payment = p.cents;
    });

    for (let i = 0; i < endOfItems; i++) {
      const line = lines[i], U = line.toUpperCase();
      if (SKIP_RE.test(U)) { pendingName = ""; continue; }
      const p = priceOf(line);
      if (!p) {
        // Línea con solo nombre: el precio puede venir en la siguiente.
        const letters = (line.match(/\p{L}/gu) || []).length;
        pendingName = letters >= 3 && !/\d+\s*@/.test(line) ? line : "";
        continue;
      }
      // "2 @ 1.99" o "2.35 lb @ 0.58/lb": el nombre venía en la línea anterior.
      if (/^\s*\d+\s*@|^\s*\d+(\.\d+)?\s*(LB|LBS|1B|IB|KG|OZ)\b/i.test(line)) {
        if (pendingName && p.cents > 0) items.push({ name: titleCase(cleanName(pendingName)).slice(0, 60), cents: p.cents });
        pendingName = ""; continue;
      }
      let name = cleanName(line.slice(0, p.index));
      if ((name.match(/\p{L}/gu) || []).length < 2 && pendingName) name = cleanName(pendingName);
      pendingName = "";
      if ((name.match(/\p{L}/gu) || []).length < 2) continue;     // sin nombre legible
      if (Math.abs(p.cents) > 100000) continue;                    // precio imposible
      items.push({ name: titleCase(name).slice(0, 60), cents: p.cents });
    }

    const itemsSum = items.reduce((n, x) => n + x.cents, 0);
    if (total === null) total = payment || (subtotal !== null ? subtotal + tax : (itemsSum > 0 ? itemsSum + tax : null));
    return { store, date, items, total, subtotal, tax, itemsSum, lines };
  }

  root.ReceiptParser = { parse, priceOf, findStore };
})(typeof window !== "undefined" ? window : globalThis);

(function () {
  if (typeof window === "undefined") return;
  const abs = p => new URL(p, location.href).href;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "vendor/tesseract/tesseract.min.js";
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("tesseract")));
      s.onerror = () => reject(new Error("tesseract"));
      document.head.appendChild(s);
    });
  }
  async function loadImage(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch {} }
    return new Promise((resolve, reject) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); resolve(i); };
      i.onerror = () => { URL.revokeObjectURL(u); reject(new Error("img")); };
      i.src = u;
    });
  }
  // Blanco y negro adaptativo: aguanta sombras y luz dispareja sobre el papel del recibo.
  function binarize(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data, n = w * h;
    const g = new Uint8ClampedArray(n);
    for (let i = 0, j = 0; j < n; i += 4, j++) g[j] = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 1; y <= h; y++) { let row = 0; for (let x = 1; x <= w; x++) { row += g[(y - 1) * w + (x - 1)]; I[y * (w + 1) + x] = I[(y - 1) * (w + 1) + x] + row; } }
    const s = Math.max(15, Math.round(w / 24)), half = s >> 1, T = 0.14;
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - half), y2 = Math.min(h - 1, y + half);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - half), x2 = Math.min(w - 1, x + half);
        const count = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = I[(y2 + 1) * (w + 1) + (x2 + 1)] - I[y1 * (w + 1) + (x2 + 1)] - I[(y2 + 1) * (w + 1) + x1] + I[y1 * (w + 1) + x1];
        const v = g[y * w + x] * count <= sum * (1 - T) ? 0 : 255;
        const k = (y * w + x) * 4; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  // Lee la foto del recibo y devuelve el texto. onProgress(0..1, mensaje)
  async function read(file, onProgress) {
    const prog = onProgress || (() => {});
    prog(0.02, "Preparando la foto…");
    const img = await loadImage(file);
    const maxW = 1800, k = Math.min(1, maxW / img.width, 4200 / img.height);
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    binarize(ctx, w, h);
    prog(0.08, "Preparando el lector…");
    const T = await loadTesseract();
    let last = 0, base = 0.15, span = 0.8;
    const worker = await T.createWorker("eng", 1, {
      workerPath: abs("vendor/tesseract/worker.min.js"),
      corePath: abs("vendor/tesseract/"),
      langPath: abs("vendor/tesseract/"),
      gzip: false, cacheMethod: "none",
      logger: m => { if (m.status === "recognizing text" && Math.abs(m.progress - last) > 0.02) { last = m.progress; prog(base + m.progress * span); } },
    });
    try {
      // Primero se lee el recibo como un solo bloque (mantiene cada precio junto a su producto).
      // Si así no salen el total o los productos, se prueba leyéndolo por columnas y se queda con la mejor lectura.
      const score = t => { const r = window.ReceiptParser.parse(t); return r.items.length + (r.total ? 5 : 0) + (r.date ? 1 : 0) + (r.store ? 1 : 0); };
      let best = "", bestScore = -1;
      for (const [i, psm] of ["6", "4"].entries()) {
        await worker.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: "1", user_defined_dpi: "300" });
        base = i === 0 ? 0.15 : 0.6; span = i === 0 ? 0.45 : 0.38;
        prog(base, i === 0 ? "Leyendo el recibo…" : "Revisando otra vez…");
        const { data } = await worker.recognize(c);
        const text = (data && data.text) || "";
        const sc = score(text);
        if (sc > bestScore) { best = text; bestScore = sc; }
        const r = window.ReceiptParser.parse(text);
        if (r.total && r.items.length >= 2) break;
      }
      prog(1, "Listo");
      return best;
    } finally {
      worker.terminate().catch(() => {}); // libera la memoria del teléfono
    }
  }
  window.ReceiptOCR = { read };
})();
