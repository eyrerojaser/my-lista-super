/* Categorías automáticas y productos comunes (español e inglés).
   Categorias.categorize(nombre) → id de categoría
   Categorias.suggest(texto)     → productos comunes que coinciden */
(function (root) {
  const CATS = [
    { id: "frutas", name: "Frutas y verduras", emoji: "🥦" },
    { id: "carnes", name: "Carnes", emoji: "🥩" },
    { id: "lacteos", name: "Lácteos", emoji: "🥛" },
    { id: "panaderia", name: "Panadería", emoji: "🍞" },
    { id: "despensa", name: "Despensa", emoji: "🥫" },
    { id: "congelados", name: "Congelados", emoji: "🧊" },
    { id: "bebidas", name: "Bebidas", emoji: "🥤" },
    { id: "botanas", name: "Botanas y dulces", emoji: "🍫" },
    { id: "limpieza", name: "Limpieza y hogar", emoji: "🧽" },
    { id: "personal", name: "Cuidado personal", emoji: "🧴" },
    { id: "bebe", name: "Bebé y mascotas", emoji: "🍼" },
    { id: "otros", name: "Otros", emoji: "🛒" },
  ];
  const BY_ID = Object.fromEntries(CATS.map(c => [c.id, c]));

  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

  // Palabras "fuertes": deciden la categoría aunque el nombre tenga otras palabras
  // (jugo de naranja → Bebidas, salsa de tomate → Despensa, caldo de pollo → Despensa).
  const STRONG = {
    bebidas: "jugo|juice|refresco|soda|agua mineral|agua|water|cafe|coffee|te helado|iced tea|te|tea|cerveza|beer|vino|wine|tequila|vodka|ron|rum|whisky|bebida|drink|gatorade|powerade|electrolit|limonada|lemonade|smoothie|kombucha|energy drink|bebida energetica|red bull|monster|coca cola|coca|pepsi|sprite|fanta|dr pepper|topo chico|jarritos|squirt|7up|horchata|nectar|leche de chocolate|chocolate milk",
    despensa: "salsa|sauce|caldo|broth|consome|sopa|soup|ramen|maruchan|cereal|avena|oatmeal|oats|granola|pasta|spaghetti|espagueti|fideo|fideos|macarrones|macaroni|noodles|arroz|rice|frijoles|frijol|beans|lentejas|lentils|garbanzos|chickpeas|harina|flour|maseca|azucar|sugar|sal|salt|pimienta|pepper spice|aceite|oil|vinagre|vinegar|mayonesa|mayonnaise|mayo|mostaza|mustard|ketchup|catsup|miel|honey|jarabe|syrup|mermelada|jam|jelly|crema de cacahuate|peanut butter|nutella|enlatado|lata|canned|atun|tuna|sardinas|chiles en lata|chipotle|especias|spices|comino|cumin|oregano|canela|cinnamon|consomate|knorr|polvo para hornear|baking powder|bicarbonato|baking soda|levadura|yeast|gelatina|jello|pure de tomate|tomato paste|tomato sauce|pancake mix|harina para hot cakes|hot cakes|pancake|cafe molido|ground coffee",
    congelados: "congelado|congelada|congelados|frozen|helado|ice cream|paleta helada|nieve|pizza|nuggets|papas a la francesa|french fries|fries|hielo|ice|waffles congelados|burritos congelados|hot pockets|lasagna congelada",
    botanas: "papitas|papas fritas|chips|tortilla chips|totopos|doritos|cheetos|takis|sabritas|ruffles|lays|pringles|fritos|galletas|galleta|cookies|cookie|crackers|chocolate|chocolates|dulce|dulces|candy|gomitas|gummies|chicle|gum|palomitas|popcorn|cacahuates|peanuts|nueces|nuts|almendras|almonds|pretzels|barras de granola|granola bar|botana|snack|snacks|pastelito|pastelitos|gansito|oreo|oreos|mazapan|pulparindo|paleta|lollipop",
    limpieza: "papel higienico|toilet paper|papel de bano|toallas de papel|paper towels|servilletas|napkins|detergente|detergent|jabon para trastes|jabon de trastes|dish soap|lavatrastes|cloro|cloralex|clorox|bleach|limpiador|cleaner|desinfectante|disinfectant|fabuloso|pinol|suavizante|suavitel|downy|fabric softener|ariel|tide|gain|bolsas de basura|trash bags|bolsas|bags|aluminio|aluminum foil|papel aluminio|plastic wrap|esponja|sponge|escoba|mop|trapeador|foco|focos|light bulb|pilas|batteries|velas|candles|lysol|windex|ajax|comet|swiffer|lavavajillas|dishwasher|toallitas desinfectantes|wipes desinfectantes|platos desechables|paper plates|vasos desechables",
    personal: "shampoo|champu|acondicionador|conditioner|jabon de bano|body wash|jabon|soap|pasta de dientes|toothpaste|cepillo de dientes|toothbrush|hilo dental|floss|enjuague bucal|mouthwash|desodorante|deodorant|crema corporal|lotion|crema|rastrillo|razor|navajas|toallas femeninas|pads|tampones|tampons|papel facial|kleenex|tissues|pañuelos|curitas|band aids|vitaminas|vitamins|medicina|medicine|tylenol|advil|ibuprofeno|paracetamol|protector solar|sunscreen|maquillaje|makeup|gel para cabello|hair gel|colgate|crest|dove|gillette|always|kotex|algodon|cotton|hisopos|q tips",
    bebe: "panales|pañales|diapers|toallitas|wipes|formula|formula de bebe|baby formula|papilla|baby food|bebe|baby|huggies|pampers|comida para perro|dog food|comida para gato|cat food|croquetas|arena para gato|cat litter|mascota|pet|perro|dog|gato|cat|premios para perro|dog treats",
  };
  const NORMAL = {
    frutas: "manzana|manzanas|apple|apples|platano|platanos|banana|bananas|guineo|naranja|naranjas|orange|oranges|limon|limones|lime|limes|lemon|lemons|uva|uvas|grapes|fresa|fresas|strawberries|strawberry|mora|moras|blueberries|arandanos|frambuesas|raspberries|pina|pineapple|mango|mangos|papaya|sandia|watermelon|melon|cantaloupe|pera|peras|pear|pears|durazno|duraznos|peach|peaches|kiwi|cereza|cerezas|cherries|aguacate|aguacates|avocado|avocados|tomate|tomates|jitomate|tomato|tomatoes|tomatillo|tomatillos|cebolla|cebollas|onion|onions|ajo|garlic|papa|papas|potato|potatoes|camote|sweet potato|zanahoria|zanahorias|carrot|carrots|lechuga|lettuce|espinaca|espinacas|spinach|brocoli|broccoli|coliflor|cauliflower|pepino|pepinos|cucumber|cucumbers|calabaza|calabacita|calabacitas|zucchini|squash|chile|chiles|jalapeno|jalapenos|serrano|poblano|pimiento|pimientos|bell pepper|peppers|cilantro|perejil|parsley|apio|celery|elote|elotes|corn|nopal|nopales|champinones|mushrooms|hongos|repollo|col|cabbage|ejotes|green beans|chayote|jicama|rabano|radish|betabel|beet|kale|fruta|frutas|fruit|verdura|verduras|vegetables|veggies|ensalada|salad|jengibre|ginger|coco|coconut",
    carnes: "pollo|chicken|pechuga|pechugas|breast|muslos|thighs|alitas|wings|carne|meat|res|beef|carne molida|ground beef|bistec|steak|arrachera|fajitas|costillas|ribs|puerco|cerdo|pork|chuleta|chuletas|pork chops|tocino|bacon|jamon|ham|salchicha|salchichas|sausage|hot dogs|hot dog|chorizo|pavo|turkey|pescado|fish|salmon|tilapia|camaron|camarones|shrimp|mariscos|seafood|atun fresco|carnitas|barbacoa|milanesa|lomo|carne para asar|carne asada|pierna|brisket|salami|pepperoni|mortadela|embutidos|deli|lunch meat|fiambre",
    lacteos: "leche|milk|queso|quesos|cheese|yogur|yogurt|yoghurt|yogures|mantequilla|butter|margarina|margarine|crema|sour cream|crema acida|media crema|half and half|nata|huevo|huevos|egg|eggs|requeson|cottage cheese|queso fresco|panela|oaxaca|cheddar|mozzarella|parmesano|parmesan|queso crema|cream cheese|leche evaporada|evaporated milk|leche condensada|condensed milk|lala|yoplait|danone|kefir|whipped cream|crema batida|leche de almendra|almond milk|leche de avena|oat milk|leche deslactosada|lactose free",
    panaderia: "pan|bread|pan dulce|conchas|bolillo|bolillos|telera|teleras|tortilla|tortillas|tortillas de maiz|tortillas de harina|bagel|bagels|bollos|buns|hamburger buns|hot dog buns|croissant|muffin|muffins|pastel|cake|donas|donuts|pan de caja|pan integral|whole wheat|baguette|pita|pan tostado|toast|bimbo|mission|guerrero|panque|roles de canela|cinnamon rolls|galletas saladas",
  };
  function compile(map, strong) {
    const out = [];
    for (const [cat, list] of Object.entries(map)) {
      for (const k of list.split("|")) { const nk = norm(k); if (nk) out.push({ k: nk, cat, w: (strong ? 100 : 0) + nk.length + nk.split(" ").length * 3 }); }
    }
    return out;
  }
  const KEYS = compile(STRONG, true).concat(compile(NORMAL, false));

  // Productos comunes para sugerir: [español, inglés, emoji, categoría]
  const COMMON = [
    ["Leche", "Milk", "🥛", "lacteos"], ["Huevos", "Eggs", "🥚", "lacteos"], ["Pan de caja", "Sliced bread", "🍞", "panaderia"],
    ["Tortillas de maíz", "Corn tortillas", "🫓", "panaderia"], ["Tortillas de harina", "Flour tortillas", "🫓", "panaderia"],
    ["Pollo", "Chicken", "🍗", "carnes"], ["Pechuga de pollo", "Chicken breast", "🍗", "carnes"], ["Carne molida", "Ground beef", "🥩", "carnes"],
    ["Plátanos", "Bananas", "🍌", "frutas"], ["Manzanas", "Apples", "🍎", "frutas"], ["Aguacates", "Avocados", "🥑", "frutas"],
    ["Tomates", "Tomatoes", "🍅", "frutas"], ["Cebolla", "Onion", "🧅", "frutas"], ["Limones", "Limes", "🍋", "frutas"],
    ["Papas", "Potatoes", "🥔", "frutas"], ["Arroz", "Rice", "🍚", "despensa"], ["Frijoles", "Beans", "🫘", "despensa"],
    ["Queso", "Cheese", "🧀", "lacteos"], ["Mantequilla", "Butter", "🧈", "lacteos"], ["Yogur", "Yogurt", "🥣", "lacteos"],
    ["Café", "Coffee", "☕", "bebidas"], ["Agua", "Water", "💧", "bebidas"], ["Refresco", "Soda", "🥤", "bebidas"],
    ["Jugo de naranja", "Orange juice", "🧃", "bebidas"], ["Papel higiénico", "Toilet paper", "🧻", "limpieza"],
    ["Toallas de papel", "Paper towels", "🧻", "limpieza"], ["Detergente", "Laundry detergent", "🧺", "limpieza"],
    ["Jabón para trastes", "Dish soap", "🧽", "limpieza"], ["Cloro", "Bleach", "🧴", "limpieza"], ["Bolsas de basura", "Trash bags", "🗑️", "limpieza"],
    ["Pasta de dientes", "Toothpaste", "🪥", "personal"], ["Shampoo", "Shampoo", "🧴", "personal"], ["Desodorante", "Deodorant", "🧴", "personal"],
    ["Jabón de baño", "Body wash", "🧼", "personal"], ["Pañales", "Diapers", "🍼", "bebe"], ["Toallitas húmedas", "Baby wipes", "🍼", "bebe"],
    ["Comida para perro", "Dog food", "🐕", "bebe"], ["Comida para gato", "Cat food", "🐈", "bebe"],
    ["Zanahorias", "Carrots", "🥕", "frutas"], ["Lechuga", "Lettuce", "🥬", "frutas"], ["Espinacas", "Spinach", "🥬", "frutas"],
    ["Brócoli", "Broccoli", "🥦", "frutas"], ["Pepinos", "Cucumbers", "🥒", "frutas"], ["Chiles jalapeños", "Jalapeños", "🌶️", "frutas"],
    ["Cilantro", "Cilantro", "🌿", "frutas"], ["Ajo", "Garlic", "🧄", "frutas"], ["Fresas", "Strawberries", "🍓", "frutas"],
    ["Uvas", "Grapes", "🍇", "frutas"], ["Naranjas", "Oranges", "🍊", "frutas"], ["Sandía", "Watermelon", "🍉", "frutas"],
    ["Piña", "Pineapple", "🍍", "frutas"], ["Mango", "Mango", "🥭", "frutas"], ["Calabacitas", "Zucchini", "🥒", "frutas"],
    ["Elotes", "Corn on the cob", "🌽", "frutas"], ["Tomatillos", "Tomatillos", "🍅", "frutas"], ["Chile serrano", "Serrano peppers", "🌶️", "frutas"],
    ["Pimientos", "Bell peppers", "🫑", "frutas"], ["Champiñones", "Mushrooms", "🍄", "frutas"], ["Nopales", "Cactus paddles", "🌵", "frutas"],
    ["Bistec", "Steak", "🥩", "carnes"], ["Chuletas de puerco", "Pork chops", "🥩", "carnes"], ["Tocino", "Bacon", "🥓", "carnes"],
    ["Jamón", "Ham", "🥓", "carnes"], ["Salchichas", "Hot dogs", "🌭", "carnes"], ["Chorizo", "Chorizo", "🌭", "carnes"],
    ["Pavo", "Turkey", "🦃", "carnes"], ["Pescado", "Fish", "🐟", "carnes"], ["Camarones", "Shrimp", "🦐", "carnes"],
    ["Salmón", "Salmon", "🐟", "carnes"], ["Tilapia", "Tilapia", "🐟", "carnes"], ["Arrachera", "Skirt steak", "🥩", "carnes"],
    ["Costillas", "Ribs", "🍖", "carnes"], ["Alitas de pollo", "Chicken wings", "🍗", "carnes"],
    ["Queso fresco", "Queso fresco", "🧀", "lacteos"], ["Queso Oaxaca", "Oaxaca cheese", "🧀", "lacteos"], ["Queso cheddar", "Cheddar cheese", "🧀", "lacteos"],
    ["Queso crema", "Cream cheese", "🧀", "lacteos"], ["Crema", "Sour cream", "🥛", "lacteos"], ["Leche evaporada", "Evaporated milk", "🥫", "lacteos"],
    ["Leche condensada", "Condensed milk", "🥫", "lacteos"], ["Leche de almendra", "Almond milk", "🥛", "lacteos"], ["Media crema", "Table cream", "🥛", "lacteos"],
    ["Bolillos", "Rolls", "🥖", "panaderia"], ["Pan dulce", "Mexican sweet bread", "🍞", "panaderia"], ["Pan para hamburguesa", "Hamburger buns", "🍔", "panaderia"],
    ["Pan para hot dog", "Hot dog buns", "🌭", "panaderia"], ["Bagels", "Bagels", "🥯", "panaderia"], ["Donas", "Donuts", "🍩", "panaderia"],
    ["Pasta", "Pasta", "🍝", "despensa"], ["Espagueti", "Spaghetti", "🍝", "despensa"], ["Fideos", "Noodles", "🍜", "despensa"],
    ["Sopa instantánea", "Instant noodles", "🍜", "despensa"], ["Harina", "Flour", "🌾", "despensa"], ["Maseca", "Corn masa flour", "🌽", "despensa"],
    ["Azúcar", "Sugar", "🍬", "despensa"], ["Sal", "Salt", "🧂", "despensa"], ["Aceite", "Cooking oil", "🫒", "despensa"],
    ["Salsa de tomate", "Tomato sauce", "🥫", "despensa"], ["Salsa picante", "Hot sauce", "🌶️", "despensa"], ["Mayonesa", "Mayonnaise", "🥫", "despensa"],
    ["Ketchup", "Ketchup", "🥫", "despensa"], ["Mostaza", "Mustard", "🥫", "despensa"], ["Atún", "Tuna", "🐟", "despensa"],
    ["Caldo de pollo", "Chicken broth", "🥫", "despensa"], ["Consomé", "Bouillon", "🥫", "despensa"], ["Cereal", "Cereal", "🥣", "despensa"],
    ["Avena", "Oatmeal", "🥣", "despensa"], ["Crema de cacahuate", "Peanut butter", "🥜", "despensa"], ["Mermelada", "Jam", "🍓", "despensa"],
    ["Miel", "Honey", "🍯", "despensa"], ["Harina para hot cakes", "Pancake mix", "🥞", "despensa"], ["Lentejas", "Lentils", "🫘", "despensa"],
    ["Chiles chipotles", "Chipotle peppers", "🥫", "despensa"], ["Frijoles refritos", "Refried beans", "🫘", "despensa"], ["Vinagre", "Vinegar", "🫙", "despensa"],
    ["Canela", "Cinnamon", "🌿", "despensa"], ["Comino", "Cumin", "🌿", "despensa"], ["Orégano", "Oregano", "🌿", "despensa"], ["Gelatina", "Jello", "🍮", "despensa"],
    ["Helado", "Ice cream", "🍦", "congelados"], ["Pizza congelada", "Frozen pizza", "🍕", "congelados"], ["Verduras congeladas", "Frozen vegetables", "🥦", "congelados"],
    ["Papas a la francesa", "French fries", "🍟", "congelados"], ["Nuggets de pollo", "Chicken nuggets", "🍗", "congelados"], ["Hielo", "Ice", "🧊", "congelados"],
    ["Waffles", "Frozen waffles", "🧇", "congelados"], ["Fruta congelada", "Frozen fruit", "🍓", "congelados"],
    ["Cerveza", "Beer", "🍺", "bebidas"], ["Vino", "Wine", "🍷", "bebidas"], ["Agua mineral", "Sparkling water", "💧", "bebidas"],
    ["Té", "Tea", "🍵", "bebidas"], ["Bebida deportiva", "Sports drink", "🥤", "bebidas"], ["Leche de chocolate", "Chocolate milk", "🥛", "bebidas"],
    ["Papitas", "Chips", "🥔", "botanas"], ["Totopos", "Tortilla chips", "🌽", "botanas"], ["Galletas", "Cookies", "🍪", "botanas"],
    ["Galletas saladas", "Crackers", "🍘", "botanas"], ["Chocolate", "Chocolate", "🍫", "botanas"], ["Dulces", "Candy", "🍬", "botanas"],
    ["Palomitas", "Popcorn", "🍿", "botanas"], ["Cacahuates", "Peanuts", "🥜", "botanas"], ["Almendras", "Almonds", "🌰", "botanas"],
    ["Barras de granola", "Granola bars", "🥣", "botanas"], ["Gomitas", "Gummies", "🍬", "botanas"],
    ["Suavizante", "Fabric softener", "🧺", "limpieza"], ["Limpiador multiusos", "All-purpose cleaner", "🧴", "limpieza"], ["Esponjas", "Sponges", "🧽", "limpieza"],
    ["Servilletas", "Napkins", "🧻", "limpieza"], ["Papel aluminio", "Aluminum foil", "📦", "limpieza"], ["Platos desechables", "Paper plates", "🍽️", "limpieza"],
    ["Pilas", "Batteries", "🔋", "limpieza"], ["Focos", "Light bulbs", "💡", "limpieza"],
    ["Acondicionador", "Conditioner", "🧴", "personal"], ["Cepillo de dientes", "Toothbrush", "🪥", "personal"], ["Hilo dental", "Dental floss", "🦷", "personal"],
    ["Toallas femeninas", "Pads", "🩷", "personal"], ["Rastrillos", "Razors", "🪒", "personal"], ["Crema corporal", "Body lotion", "🧴", "personal"],
    ["Pañuelos desechables", "Tissues", "🤧", "personal"], ["Vitaminas", "Vitamins", "💊", "personal"], ["Curitas", "Band-aids", "🩹", "personal"],
    ["Fórmula para bebé", "Baby formula", "🍼", "bebe"], ["Papillas", "Baby food", "🍼", "bebe"], ["Arena para gato", "Cat litter", "🐈", "bebe"],
  ].map(([es, en, emoji, cat], i) => ({ es, en, emoji, cat, rank: i, nes: norm(es), nen: norm(en) }));
  const COMMON_BY_NAME = new Map();
  COMMON.forEach(c => { COMMON_BY_NAME.set(c.nes, c); COMMON_BY_NAME.set(c.nen, c); });

  /* ---------- categorías elegidas a mano (se recuerdan) ---------- */
  const OV_KEY = "cat-overrides-v1";
  let overrides = {};
  try { overrides = JSON.parse(localStorage.getItem(OV_KEY)) || {}; } catch {}
  function setOverride(name, cat) {
    const n = norm(name); if (!n || !BY_ID[cat]) return;
    overrides[n] = cat;
    try { localStorage.setItem(OV_KEY, JSON.stringify(overrides)); } catch {}
  }

  function stem(w) { return w.length > 4 && w.endsWith("es") ? [w, w.slice(0, -2), w.slice(0, -1)] : w.length > 3 && w.endsWith("s") ? [w, w.slice(0, -1)] : [w]; }

  // Categorías de la base de datos de productos (Open Food Facts), de la más específica a la más general.
  const TAGS = {
    "en:ice-creams": "congelados", "en:frozen-foods": "congelados", "en:frozen-desserts": "congelados",
    "en:cheeses": "lacteos", "en:milks": "lacteos", "en:yogurts": "lacteos", "en:butters": "lacteos", "en:eggs": "lacteos", "en:dairies": "lacteos", "en:creams": "lacteos",
    "en:meats": "carnes", "en:poultries": "carnes", "en:fishes": "carnes", "en:seafood": "carnes", "en:hams": "carnes", "en:sausages": "carnes",
    "en:fresh-fruits": "frutas", "en:fresh-vegetables": "frutas", "en:fruits": "frutas", "en:vegetables": "frutas",
    "en:breads": "panaderia", "en:tortillas": "panaderia", "en:flatbreads": "panaderia", "en:pastries": "panaderia",
    "en:sodas": "bebidas", "en:waters": "bebidas", "en:juices": "bebidas", "en:fruit-juices": "bebidas", "en:coffees": "bebidas", "en:teas": "bebidas",
    "en:beers": "bebidas", "en:wines": "bebidas", "en:alcoholic-beverages": "bebidas", "en:energy-drinks": "bebidas", "en:beverages": "bebidas",
    "en:chips-and-fries": "botanas", "en:crisps": "botanas", "en:chocolates": "botanas", "en:candies": "botanas", "en:confectioneries": "botanas",
    "en:biscuits": "botanas", "en:cookies": "botanas", "en:salty-snacks": "botanas", "en:sweet-snacks": "botanas", "en:snacks": "botanas",
    "en:breakfast-cereals": "despensa", "en:cereals-and-potatoes": "despensa", "en:pastas": "despensa", "en:rices": "despensa", "en:legumes": "despensa",
    "en:sauces": "despensa", "en:condiments": "despensa", "en:canned-foods": "despensa", "en:spices": "despensa", "en:vegetable-oils": "despensa", "en:sugars": "despensa", "en:flours": "despensa",
    "en:baby-foods": "bebe", "en:baby-milks": "bebe", "en:pet-food": "bebe",
  };
  function fromTags(tags) {
    if (!Array.isArray(tags)) return "";
    // Las etiquetas vienen de lo general a lo específico: se busca desde el final.
    for (let i = tags.length - 1; i >= 0; i--) if (TAGS[tags[i]]) return TAGS[tags[i]];
    return "";
  }

  // Devuelve el id de la categoría para un nombre de producto (tagCat: la que dio la base de datos, si hay).
  function categorize(name, tagCat) {
    const n = norm(name);
    if (!n) return "otros";
    if (overrides[n]) return overrides[n];
    if (tagCat && BY_ID[tagCat]) return tagCat;
    const common = COMMON_BY_NAME.get(n);
    if (common) return common.cat;
    // Compara también sin plurales (manzanas → manzana).
    const words = n.split(" ");
    const variants = new Set([" " + n + " ", " " + words.map(w => stem(w).slice(-1)[0]).join(" ") + " "]);
    let best = null;
    for (const key of KEYS) {
      for (const v of variants) {
        if (v.includes(" " + key.k + " ") && (!best || key.w > best.w)) best = key;
      }
    }
    return best ? best.cat : "otros";
  }
  function emojiFor(name) {
    const c = COMMON_BY_NAME.get(norm(name));
    return c ? c.emoji : null;
  }

  /* ---------- sugerencias ---------- */
  // Busca en productos comunes (español e inglés). Muestra el nombre en el idioma en que se escribió.
  function suggest(q, limit) {
    const n = norm(q);
    const out = [];
    if (!n) return out;
    for (const c of COMMON) {
      const sEs = score(c.nes, n), sEn = score(c.nen, n);
      const s = Math.max(sEs, sEn);
      if (s > 0) out.push({ name: sEn > sEs ? c.en : c.es, emoji: c.emoji, cat: c.cat, s, rank: c.rank });
    }
    out.sort((a, b) => b.s - a.s || a.rank - b.rank);
    const seen = new Set();
    return out.filter(x => { const k = norm(x.name); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, limit || 6);
  }
  function score(target, q) {
    if (target === q) return 100;
    if (target.startsWith(q)) return 60 - Math.min(20, target.length - q.length);
    if ((" " + target).includes(" " + q)) return 40;
    if (q.length >= 3 && target.includes(q)) return 20;
    return 0;
  }
  function popular(limit) { return COMMON.slice(0, limit || 16).map(c => ({ name: c.es, emoji: c.emoji, cat: c.cat })); }

  root.Categorias = { CATS, BY_ID, categorize, fromTags, suggest, popular, setOverride, emojiFor, norm };
})(typeof window !== "undefined" ? window : globalThis);
