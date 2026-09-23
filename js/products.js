/* Identificación de productos por código de barras.
   Usa las bases de datos públicas de Open Food Facts (alimentos),
   Open Products Facts (hogar) y Open Beauty Facts (higiene).
   Guarda cada resultado en el teléfono para que el mismo producto
   se reconozca al instante y sin internet la próxima vez. */
(function () {
  const CACHE_KEY = "grocery-products-v1";
  const FIELDS = "product_name,product_name_es,product_name_en,generic_name_es,generic_name,brands,quantity,image_front_small_url,image_small_url,categories_tags";
  const SOURCES = [
    "https://world.openfoodfacts.org",
    "https://world.openproductsfacts.org",
    "https://world.openbeautyfacts.org",
  ];

  const EMOJI_RULES = [
    [/baby|bebe|infant/, "🍼"], [/pet-food|dog|cat-food|perro|gato/, "🐾"],
    [/ice-cream|helado/, "🍦"], [/yogurt|yoghurt/, "🥣"], [/chees|queso/, "🧀"],
    [/milk|leche|dairies|lacteo/, "🥛"], [/egg|huevo/, "🥚"], [/butter|mantequilla/, "🧈"],
    [/tortilla/, "🫓"], [/bread|pan-|breads|bakery|panader/, "🍞"], [/biscuit|cookie|galleta/, "🍪"],
    [/chocolate/, "🍫"], [/candies|candy|confectioner|dulce|gum/, "🍬"],
    [/chips|crisps|snack|botana/, "🥨"], [/breakfast-cereal|cereal|oat|avena/, "🥣"],
    [/pasta|noodle|spaghetti|sopa/, "🍝"], [/rice|arroz/, "🍚"], [/bean|frijol|legume/, "🫘"],
    [/coffee|cafe/, "☕"], [/tea|te-/, "🍵"], [/beer|cerveza/, "🍺"], [/wine|vino/, "🍷"],
    [/spirit|tequila|liquor|whisk/, "🥃"], [/juice|jugo|nectar/, "🧃"],
    [/water|agua/, "💧"], [/soda|soft-drink|carbonated|cola|beverage|drink|bebida/, "🥤"],
    [/sauce|salsa|ketchup|mayonnaise|condiment|dressing/, "🥫"], [/canned|conserva|lata/, "🥫"],
    [/oil|aceite/, "🫒"], [/sugar|azucar|honey|miel|syrup/, "🍯"], [/flour|harina/, "🌾"],
    [/chicken|pollo|poultry/, "🍗"], [/meat|carne|beef|pork|sausage|ham|jamon|salchicha/, "🥩"],
    [/fish|seafood|tuna|atun|pescado/, "🐟"], [/frozen|congelad/, "🧊"],
    [/fruit|fruta|apple|banana/, "🍎"], [/vegetable|verdura|legumbre/, "🥦"],
    [/shampoo|soap|jabon|toothpaste|deodorant|cosmetic|beauty|hygiene/, "🧴"],
    [/detergent|cleaning|limpieza|cloro|bleach/, "🧽"], [/toilet-paper|papel|tissue|napkin/, "🧻"],
  ];

  function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
  }
  let cache = loadCache();
  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  }

  function emojiFor(tags, name) {
    const hay = ((tags || []).join(" ") + " " + (name || "")).toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const [re, e] of EMOJI_RULES) if (re.test(hay)) return e;
    return "🛒";
  }

  function tidy(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

  function fromApi(code, p) {
    const base = tidy(p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || p.product_name_en);
    const brand = tidy((p.brands || "").split(",")[0]);
    const qty = tidy(p.quantity);
    if (!base && !brand) return null;
    let name = base || brand;
    if (brand && base && !base.toLowerCase().includes(brand.toLowerCase())) name = base + " " + brand;
    return {
      code,
      name: name.slice(0, 70),
      detail: qty,
      emoji: emojiFor(p.categories_tags, name),
      img: p.image_front_small_url || p.image_small_url || "",
      source: "db",
    };
  }

  async function fetchJson(url, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, headers: { Accept: "application/json" } });
      if (!r.ok && r.status !== 404) throw new Error("http " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  /* Devuelve:
     {status:"found", product}  — identificado
     {status:"unknown"}         — no existe en las bases de datos
     {status:"offline"}         — sin internet o el servicio no respondió */
  async function lookup(code) {
    if (cache[code]) return { status: "found", product: cache[code], cached: true };
    if (!navigator.onLine) return { status: "offline" };
    let reached = false;
    for (const host of SOURCES) {
      try {
        const data = await fetchJson(host + "/api/v2/product/" + encodeURIComponent(code) + ".json?fields=" + FIELDS, 7000);
        reached = true;
        if (data && data.status === 1 && data.product) {
          const product = fromApi(code, data.product);
          if (product) { cache[code] = product; saveCache(); return { status: "found", product }; }
        }
      } catch (e) { /* prueba la siguiente fuente */ }
    }
    return reached ? { status: "unknown" } : { status: "offline" };
  }

  /* Guarda el nombre que la persona escribió para un código desconocido. */
  function remember(code, name) {
    name = tidy(name).slice(0, 70);
    if (!code || !name) return null;
    const product = { code, name, detail: "", emoji: emojiFor([], name), img: "", source: "user" };
    cache[code] = product; saveCache();
    return product;
  }

  window.Products = { lookup, remember, emojiFor };
})();
