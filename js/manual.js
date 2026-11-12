/* Manual de uso de NoPencil: el PDF (español o inglés, según el idioma de la app) se abre dentro de la app.
   Se dibuja con pdf.js (vendor/pdfjs). Cada pantalla puede abrir el manual directo en su sección: Manual.open("cart"). */
(function () {
  const T = s => (window.I18N ? I18N.t(s) : s);
  const lang = () => (window.I18N && I18N.lang() === "en" ? "en" : "es");
  const VER = "2"; // cambia cuando se actualiza el manual
  let view = null, pdfjs = null;

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function close() { if (!view) return; view.box.remove(); if (view.io) view.io.disconnect(); view = null; document.body.classList.remove("man-open"); }
  document.addEventListener("keydown", e => { if (e.key === "Escape" && view) { e.stopImmediatePropagation(); if (view.toc && !view.toc.classList.contains("hidden")) view.toc.classList.add("hidden"); else close(); } }, true);

  async function open(section) {
    close();
    const L = lang(), file = "manual/nopencil-manual-" + L + ".pdf?v=" + VER;
    const box = el("section", "man"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", T("Manual de uso"));
    const head = el("header", "man-head");
    const back = el("button", "man-back"); back.type = "button"; back.setAttribute("aria-label", T("Cerrar"));
    back.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    back.onclick = close;
    const ttl = el("div", "man-ttl"); ttl.append(el("b", "", T("Manual de uso")), el("small", "man-pg", ""));
    const tocBtn = el("button", "man-btn", "☰ " + T("Índice")); tocBtn.type = "button";
    const dl = el("a", "man-btn man-dl", "⬇ PDF"); dl.href = file; dl.download = "NoPencil-" + (L === "en" ? "User-Guide" : "Manual-de-uso") + ".pdf"; dl.setAttribute("aria-label", T("Descargar PDF"));
    head.append(back, ttl, tocBtn, dl);
    const pages = el("div", "man-pages");
    const toc = el("nav", "man-toc hidden"); toc.setAttribute("aria-label", T("Índice"));
    const status = el("p", "man-status", T("Abriendo el manual…"));
    pages.append(status);
    box.append(head, pages, toc);
    document.body.append(box); document.body.classList.add("man-open");
    view = { box, pages, toc };
    tocBtn.onclick = () => toc.classList.toggle("hidden");
    back.focus();

    try {
      if (!pdfjs) {
        pdfjs = await import(new URL("vendor/pdfjs/pdf.min.mjs", location.href).href);
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
      }
      const [doc, list] = await Promise.all([
        pdfjs.getDocument({ url: file, isEvalSupported: false }).promise,
        fetch("manual/toc-" + L + ".json?v=" + VER).then(r => r.json()).catch(() => []),
      ]);
      if (!view || view.box !== box) return;
      status.remove();
      const first = await doc.getPage(1), vp1 = first.getViewport({ scale: 1 });
      const ratio = vp1.height / vp1.width;
      const slots = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const s = el("div", "man-page"); s.style.aspectRatio = "1 / " + ratio; s.dataset.n = n;
        s.setAttribute("role", "img"); s.setAttribute("aria-label", T("Página") + " " + n);
        pages.append(s); slots.push(s);
      }
      const done = new Set();
      async function draw(s) {
        const n = +s.dataset.n; if (done.has(n)) return; done.add(n);
        const page = await doc.getPage(n);
        const w = s.clientWidth || pages.clientWidth, dpr = Math.min(3, window.devicePixelRatio || 1);
        const vp = page.getViewport({ scale: (w * dpr) / page.getViewport({ scale: 1 }).width });
        const c = document.createElement("canvas"); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
        await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
        s.append(c); s.classList.add("ready");
      }
      const pg = ttl.querySelector(".man-pg");
      view.io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) draw(e.target).catch(() => {});
      }), { root: pages, rootMargin: "120% 0px" });
      // Número de la página que se está viendo
      const label = () => { const y = pages.scrollTop + pages.clientHeight * 0.35; let n = 1; for (const s of slots) { if (s.offsetTop <= y) n = +s.dataset.n; else break; } pg.textContent = T("Página") + " " + n + " / " + doc.numPages; };
      pages.addEventListener("scroll", () => requestAnimationFrame(label), { passive: true }); label();
      slots.forEach(s => view.io.observe(s));
      // Índice
      const ul = el("ul");
      (list || []).forEach(it => {
        const li = el("li"); const b = el("button", it.sub ? "sub" : "", it.title); b.type = "button";
        const pn = el("span", "", String(it.page)); b.append(pn);
        b.onclick = () => { toc.classList.add("hidden"); go(it.page); };
        li.append(b); ul.append(li);
      });
      toc.replaceChildren(el("h3", "", T("Índice")), ul);
      function go(n) { const s = slots[Math.max(0, Math.min(slots.length - 1, n - 1))]; if (s) { pages.scrollTo({ top: s.offsetTop - 8 }); label(); } }
      if (section) { const it = (list || []).find(x => x.id === section); if (it) requestAnimationFrame(() => go(it.page)); }
    } catch (e) {
      status.textContent = navigator.onLine ? T("No se pudo abrir el manual. Intenta de nuevo.") : T("Sin conexión. Abre el manual una vez con internet para tenerlo siempre.");
    }
  }
  function link(section) {
    const b = el("button", "man-link", "📖 " + T("Más en el Manual de uso")); b.type = "button";
    b.onclick = () => open(section);
    return b;
  }
  window.Manual = { open, link };
})();
