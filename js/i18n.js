/* Idiomas: español (original) e inglés.
   La app está escrita en español; este archivo traduce al inglés lo que se ve en pantalla
   (también lo que se crea mientras se usa la app) y los textos que se descargan o se comparten.
   I18N.t("texto")   → el texto en el idioma elegido
   I18N.loc()        → "es" o "en-US" para fechas
   I18N.toggle()     → cambia de idioma */
(function () {
  const KEY = "lang-v1";
  let lang = null;
  try { lang = localStorage.getItem(KEY); } catch {}
  if (lang !== "es" && lang !== "en") lang = /^en\b/i.test(navigator.language || "") ? "en" : "es";
  document.documentElement.lang = lang;

  const D = {
    // ----- Encabezado y Mi lista -----
    "Mi lista del súper": "My grocery list", "Tu súper de hoy": "Today's list", "Hola": "Hi",
    "Buenos días": "Good morning", "Buenas tardes": "Good afternoon", "Buenas noches": "Good evening",
    "❄️ Freezer": "❄️ Freezer", "Abrir Freezer Scan": "Open Freezer Scan", "Instalar": "Install",
    "Escanear producto": "Scan product", "Escanear producto con la cámara": "Scan a product with the camera",
    "Apunta al código de barras. Se agrega solo a tu lista.": "Point at the barcode. It's added to your list automatically.",
    "Abrir cámara": "Open camera", "Instálala: toca": "Install it: tap", "Compartir": "Share", "y luego": "and then",
    "Agregar a inicio": "Add to Home Screen", "Agregar por nombre…": "Add by name…", "Agregar producto por nombre": "Add a product by name",
    "Agregar": "Add", "Por comprar": "To buy", "En el carrito": "In the cart", "Unidades": "Units",
    "Mis Compras": "My Purchases", "Registra lo que gastas en el súper": "Track what you spend on groceries",
    "Lista compartida": "Shared list", "Compártela con tu familia desde su teléfono": "Share it with your family on their phones",
    "Mi lista": "My list", "Descargar": "Download", "Enviar lista": "Send list", "Quitar comprados": "Clear bought items",
    "Tu lista está vacía. Así funciona:": "Your list is empty. Here's how it works:", "Escanea": "Scan",
    "Apunta la cámara al código de barras": "Point the camera at the barcode", "Se agrega solo": "It's added automatically",
    "Lo identifica y lo pone en tu lista": "It identifies it and adds it to your list", "Márcalo": "Check it off",
    "Tócalo en la tienda al echarlo al carrito": "Tap it in the store when it goes in the cart",
    "Escanear": "Scan", "Productos sugeridos": "Suggested products", "Agregar productos": "Add products", "En tu lista: 1 producto": "On your list: 1 item", "Productos comunes": "Common products",
    "Uno menos": "One less", "Uno más": "One more", "Quitar": "Remove", "¡Todo listo! 🎉": "All done! 🎉", "Falta 1": "1 left",
    "1 en el carrito": "1 in the cart", "Se identificará con internet": "Will be identified when online",
    "Cambiar categoría": "Change category", "Cancelar": "Cancel", "Cerrar": "Close", "Deshacer": "Undo", "Guardar": "Save",
    "Lista guardada en Descargas": "List saved to Downloads", "Nada pendiente": "Nothing left to buy",
    "El enlace de la lista no es válido": "The list link isn't valid", "Te enviaron una lista": "Someone sent you a list",
    "1 producto para agregar a tu lista:": "1 item to add to your list:", "Agregar a mi lista": "Add to my list",
    "Se agregó 1 producto": "1 item added", "Quitaste 1 producto": "You removed 1 item",
    // ----- Escáner -----
    "Escáner de código de barras": "Barcode scanner", "Cerrar escáner": "Close scanner", "Apunta al código": "Point at the barcode",
    "Linterna": "Flashlight", "Teclear código": "Type code", "Listo": "Done", "1 producto agregado": "1 item added",
    "Buscando producto…": "Looking up product…", "Agregado a tu lista": "Added to your list", "Producto nuevo": "New product",
    "Ej. Salsa Valentina": "E.g. Valentina hot sauce", "Guardar y agregar": "Save and add", "Guardado y agregado": "Saved and added",
    "Abriendo cámara…": "Opening camera…", "Coloca el código de barras dentro del recuadro": "Place the barcode inside the frame",
    "Permite el acceso a la cámara": "Allow camera access",
    "Ve a los ajustes del navegador o del teléfono, permite la cámara para este sitio y vuelve a intentarlo. Mientras, puedes teclear el código.": "Go to your browser or phone settings, allow the camera for this site and try again. Meanwhile, you can type the code.",
    "No se encontró una cámara": "No camera found", "Puedes teclear el código de barras.": "You can type the barcode number.",
    "La cámara está ocupada": "The camera is busy", "Cierra otras apps que la estén usando y vuelve a intentarlo.": "Close other apps using it and try again.",
    "Se necesita una conexión segura": "A secure connection is needed", "Abre la app desde su dirección https:// para usar la cámara.": "Open the app from its https:// address to use the camera.",
    "No se pudo abrir la cámara": "Couldn't open the camera", "Vuelve a intentarlo o teclea el código de barras.": "Try again or type the barcode number.",
    "Escribe los números debajo del código de barras.": "Type the numbers under the barcode.", "Buscar": "Search",
    "Sin internet: se identificará al volver la conexión": "No internet: it will be identified when you're back online",
    // ----- Categorías -----
    "Frutas y Vegetales": "Fruits & Vegetables", "Carnes y Mariscos": "Meat & Seafood", "Lácteos y Huevos": "Dairy & Eggs", "Panadería": "Bakery",
    "Despensa": "Pantry", "Bebidas": "Beverages", "Congelados": "Frozen", "Limpieza del Hogar": "Household Cleaning", "Cuidado Personal": "Personal Care",
    "Bebé": "Baby", "Mascotas": "Pets", "Otros": "Other",
    // ----- Enviar / compartir -----
    "Me invitaron: tengo un código": "I was invited: I have a code", "Compartir mi lista": "Share my list", "Creando…": "Creating…",
    "Escribe el código que te enviaron": "Type the code you received", "Código de 12 letras": "12-character code", "Unirme": "Join",
    "Código de la lista": "List code", "Invitar a alguien": "Invite someone", "Copiar código": "Copy code", "Código copiado": "Code copied",
    "Salir de la lista compartida": "Leave the shared list", "Te invitaron a una lista": "You've been invited to a list",
    "Unirme a la lista": "Join the list", "¿Salir de la lista compartida?": "Leave the shared list?", "Salir": "Leave",
    "Te quedas con una copia en este teléfono, pero tus cambios ya no se verán en los otros teléfonos.": "You keep a copy on this phone, but your changes won't show on the other phones anymore.",
    "Toca Compartir mi lista y la app te dará un código para invitar a tu familia. Cuando alguien agregue, quite o marque un producto, el cambio aparecerá en los demás teléfonos en unos segundos.": "Tap Share my list and the app will give you a code to invite your family. When someone adds, removes or checks off an item, the change shows on the other phones within seconds.",
    "Esta lista está compartida. Invita a quien quieras con el enlace o el código.": "This list is shared. Invite anyone with the link or the code.",
    "La lista compartida todavía no está activada en esta app. (La lista compartida funciona cuando la app está publicada en Netlify.)": "The shared list isn't active in this app yet.",
    "Conectando…": "Connecting…", "Conectada: los cambios aparecen en los otros teléfonos en unos segundos": "Connected: changes show on the other phones within seconds",
    "Sin conexión: tus cambios se enviarán al volver la señal": "Offline: your changes will be sent when you're back online",
    "No se pudo conectar. Se reintentará.": "Couldn't connect. It will retry.", "Esta lista compartida ya no existe": "This shared list no longer exists",
    "Compartida · al día": "Shared · up to date", "Compartida · sin conexión": "Shared · offline", "Compartida · conectando…": "Shared · connecting…",
    "Compartida · revisa la conexión": "Shared · check your connection", "Te uniste a la lista compartida.": "You joined the shared list.",
    "No se pudo crear la lista compartida. Revisa tu conexión.": "Couldn't create the shared list. Check your connection.",
    "El código tiene 12 letras y números.": "The code has 12 letters and numbers.", "No encontré esa lista. Revisa el código.": "I couldn't find that list. Check the code.",
    "No se pudo abrir la lista compartida. Revisa tu conexión.": "Couldn't open the shared list. Check your connection.",
    "Saliste de la lista compartida. Tu copia se queda en este teléfono.": "You left the shared list. Your copy stays on this phone.",
    // ----- Freezer Scan -----
    "Freezer Scan": "Freezer Scan", "Volver a Mi lista": "Back to My list", "Avisos": "Alerts", "Activar avisos": "Turn on alerts", "Avisos activos": "Alerts on",
    "Escanear para el freezer": "Scan for the freezer", "Escanea el producto y su fecha. Te avisamos 3 días antes.": "Scan the product and its date. We'll remind you 3 days before.",
    "Empezar": "Start", "Sin código de barras: escribir nombre": "No barcode: type the name", "En el freezer": "In the freezer",
    "Aún no hay nada en el freezer": "Nothing in the freezer yet", "Escanea un producto y su fecha para llevar la cuenta de los días.": "Scan a product and its date to keep track of the days.",
    "Freezer: escanear producto": "Freezer: scan product", "Paso 1 de 2 · Producto": "Step 1 of 2 · Product", "Escribir nombre": "Type name", "Tomar foto": "Take photo",
    "Freezer: leer fecha": "Freezer: read date", "Paso 2 de 2 · Fecha": "Step 2 of 2 · Date", "Fecha leída": "Date read", "Reintentar": "Try again", "Usar": "Use",
    "Escribir fecha": "Type date", "+1 mes": "+1 month", "+3 meses": "+3 months", "+6 meses": "+6 months", "Usar primero": "Use first", "Usado": "Used",
    "Tiempo restante": "Time left", "Vence hoy": "Expires today", "Venció ayer": "Expired yesterday", "Queda 1 día": "1 day left", "1 producto": "1 item",
    "Fecha": "Date", "Expira": "Expires", "fecha leída": "date read", "Entrada: hoy": "Added: today", "No se encontró fecha impresa": "No printed date found",
    "Sin internet": "No internet", "Continuar": "Continue", "Ej. Pechuga de pollo": "E.g. Chicken breast", "Ej. Carne molida": "E.g. Ground beef",
    "Nombre del producto": "Product name", "Por ejemplo: carne molida, tamales, pan.": "For example: ground beef, tamales, bread.",
    "Buscando el código en la foto…": "Looking for the barcode in the photo…", "No encontré un código en la foto. Acércate más o escribe el nombre.": "I couldn't find a barcode in the photo. Get closer or type the name.",
    "Preparando el lector de fechas…": "Getting the date reader ready…", "Apunta a la fecha impresa (Freeze By, Sell By, Use By, Best By)": "Point at the printed date (Freeze By, Sell By, Use By, Best By)",
    "Leyendo…": "Reading…", "Leyendo la fecha en la foto…": "Reading the date in the photo…",
    "Elige la fecha impresa en el empaque, o cuánto tiempo lo quieres guardar.": "Pick the date printed on the package, or how long you want to keep it.",
    "Permite el acceso a la cámara en los ajustes del teléfono.": "Allow camera access in your phone settings.", "No se encontró una cámara.": "No camera found.",
    "La cámara está ocupada por otra app.": "The camera is being used by another app.", "No se pudo abrir la cámara.": "Couldn't open the camera.",
    "No se pudo preparar el lector de fechas.": "Couldn't get the date reader ready.", "Instala la app primero": "Install the app first",
    "En iPhone los avisos solo funcionan con la app instalada: en Safari toca Compartir → Agregar a inicio, y ábrela desde el ícono.": "On iPhone, alerts only work with the app installed: in Safari tap Share → Add to Home Screen, and open it from the icon.",
    "Entendido": "Got it", "Este navegador no permite avisos.": "This browser doesn't allow alerts.",
    "Sin permiso no se pueden enviar avisos. Actívalo en los ajustes del teléfono.": "Without permission we can't send alerts. Turn it on in your phone settings.",
    "Listo: te avisaremos 3 días antes de cada fecha.": "Done: we'll remind you 3 days before each date.", "Avisos activados: se revisan cada vez que abres la app.": "Alerts on: they're checked every time you open the app.",
    "Los avisos están activos. Para apagarlos, usa los ajustes de notificaciones del teléfono.": "Alerts are on. To turn them off, use your phone's notification settings.",
    "❄️ Freezer: úsalo pronto": "❄️ Freezer: use it soon",
    "📄 Leer etiqueta (carne, pollo, pescado)": "📄 Read label (meat, chicken, fish)", "Leyendo la etiqueta…": "Reading the label…", "Nombre y fecha": "Name and date",
    "Leyendo la etiqueta…": "Reading the label…", "Buscando la fecha…": "Looking for the date…", "Revisa el nombre": "Check the name",
    "Esto leí en la etiqueta. Corrígelo o escríbelo como prefieras (por ejemplo, Milanesa).": "This is what I read on the label. Fix it or type it however you like.",
    "No pude leer el nombre en la etiqueta. Escríbelo.": "I couldn't read the name on the label. Type it.", "Ej. Milanesa de res": "E.g. Beef steak",
    "¿Carne, pollo o pescado de la tienda? Ese código no se puede escanear: toca Leer etiqueta.": "Store meat, chicken or fish? That code can't be scanned: tap Read label.",
    "Ese código es de la tienda (producto pesado). Toca Leer etiqueta para sacar el nombre y la fecha.": "That's a store code (weighed product). Tap Read label to get the name and date.",
    "Puedes leer la etiqueta o escribir el nombre.": "You can read the label or type the name.",
    "Toma una foto o escribe la fecha.": "Take a photo or type the date.", "Puedes tomar una foto o escribir el nombre.": "You can take a photo or type the name.",
    "Escribe su nombre.": "Type its name.", "Abriendo cámara…": "Opening camera…",
    // ----- Mis Compras -----
    "Gastos del súper": "Grocery spending", "Mes anterior": "Previous month", "Mes siguiente": "Next month", "TOTAL GASTADO DEL MES": "TOTAL SPENT THIS MONTH",
    "Sin compras este mes": "No purchases this month", "1 compra registrada": "1 purchase recorded", "¿Cómo quieres guardar tu recibo?": "How do you want to save your receipt?",
    "Escanear recibo": "Scan receipt", "Lee tienda, fecha, productos y total": "Reads store, date, items and total", "Hasta 20 productos": "Up to 20 items",
    "Solo guarda la foto; tú escribes el total": "Just saves the photo; you type the total", "Cualquier recibo": "Any receipt",
    "Dom": "Sun", "Lun": "Mon", "Mar": "Tue", "Mié": "Wed", "Jue": "Thu", "Vie": "Fri", "Sáb": "Sat",
    "Registrar compra": "Add purchase", "No hay compras registradas este día.": "No purchases on this day.", "Descargar resumen mensual": "Download monthly summary",
    "Compras del mes": "This month's purchases", "Toca un día del calendario para registrar tu primera compra.": "Tap a day on the calendar to add your first purchase.",
    "Editar compra": "Edit purchase", "¿Cuánto gastaste?": "How much did you spend?", "Escribe cuánto gastaste, por ejemplo 45.30": "Type how much you spent, for example 45.30",
    "Tienda (opcional)": "Store (optional)", "Ej. H-E-B, Walmart": "E.g. H-E-B, Walmart", "Foto del recibo": "Receipt photo", "Subir foto del recibo": "Upload receipt photo",
    "Cambiar foto": "Change photo", "Quitar foto": "Remove photo", "Preparando foto…": "Preparing photo…", "Ver y corregir productos": "View and fix items",
    "Borrar esta compra": "Delete this purchase", "Ver la foto del recibo": "View the receipt photo", "Ver foto del recibo": "View receipt photo", "Agregar foto del recibo": "Add receipt photo",
    "Sin foto": "No photo", "Compra": "Purchase", "Cambios guardados": "Changes saved", "No se encontró la foto.": "Photo not found.",
    "No se pudo abrir esa foto. Prueba con otra.": "Couldn't open that photo. Try another one.", "No se pudo guardar. Revisa el espacio del teléfono.": "Couldn't save. Check your phone's storage.",
    "La compra se guardó, pero la foto no. Intenta de nuevo.": "The purchase was saved, but the photo wasn't. Try again.",
    "La compra se guardó, pero la foto no. Puedes agregarla con el lápiz.": "The purchase was saved, but the photo wasn't. You can add it with the pencil.",
    "Resumen guardado en Descargas": "Summary saved to Downloads", "Leyendo el recibo": "Reading the receipt", "Leyendo el recibo…": "Reading the receipt…",
    "Revisando otra vez…": "Checking again…", "Preparando la foto…": "Preparing the photo…", "Preparando el lector…": "Getting the reader ready…",
    "Puede tardar unos segundos. Mantén la app abierta.": "It may take a few seconds. Keep the app open.", "Revisa el recibo": "Check the receipt",
    "Corrige lo que haga falta antes de guardar.": "Fix anything needed before saving.", "Tienda": "Store", "Ej. H-E-B": "E.g. H-E-B", "Fecha de la compra": "Purchase date",
    "Productos (": "Items (", "+ Agregar producto": "+ Add item", "Suma de productos": "Items total", "Impuestos y otros": "Taxes and other",
    "Productos no leídos e impuestos": "Unread items and taxes", "Los productos suman más que el total": "Items add up to more than the total",
    "Total pagado": "Total paid", "Escribe el total del recibo, por ejemplo 45.30": "Type the receipt total, for example 45.30", "Guardar compra": "Save purchase",
    "Producto": "Item", "Precio": "Price", "Quitar producto": "Remove item", "Productos de la compra": "Purchase items",
    "No se pudo leer el recibo. Escribe los datos; la foto se guardará igual.": "Couldn't read the receipt. Type the details; the photo will be saved anyway.",
    "Corrige lo que haga falta y guarda.": "Fix anything needed and save.", "Revisa y corrige lo que haga falta antes de guardar.": "Check and fix anything needed before saving.",
    "No encontré productos claros. Agrégalos o guarda solo el total.": "I couldn't find clear items. Add them or save just the total.",
    "Parece que no se leyeron todos los productos (funciona mejor con recibos de hasta 20). El total sí se guarda completo; agrega los que falten si quieres.": "It looks like not all items were read (works best with receipts of up to 20). The full total is still saved; add the missing ones if you want.",
    "No se guardó el recibo": "The receipt wasn't saved",
    // ----- Cuenta -----
    "🎉 Promoción de lanzamiento": "🎉 Launch promotion", "Crea tu cuenta": "Create your account", "Regístrate para empezar a usar tu lista del súper.": "Sign up to start using your grocery list.",
    "Nombre": "Name", "Correo": "Email", "Contraseña (mínimo 8 caracteres)": "Password (at least 8 characters)", "Crear cuenta": "Create account",
    "Ya tengo cuenta: iniciar sesión": "I have an account: log in", "Inicia sesión": "Log in", "Entra con el correo y la contraseña de tu cuenta.": "Log in with your account email and password.",
    "Contraseña": "Password", "Entrar": "Log in", "No tengo cuenta: crear una": "I don't have an account: create one", "Olvidé mi contraseña": "I forgot my password",
    "¿Olvidaste tu contraseña?": "Forgot your password?", "Escribe tu correo y te damos un código de 6 números para poner una nueva.": "Type your email and we'll give you a 6-digit code to set a new one.",
    "Pedir código": "Get code", "Volver a iniciar sesión": "Back to log in", "Nueva contraseña": "New password", "Código de 6 números": "6-digit code",
    "Contraseña nueva (mínimo 8 caracteres)": "New password (at least 8 characters)", "Guardar y entrar": "Save and log in",
    "Necesitas internet para entrar a tu cuenta.": "You need internet to log in to your account.", "Escribe tu nombre.": "Type your name.",
    "La contraseña debe tener al menos 8 caracteres.": "The password must be at least 8 characters.", "Algo salió mal. Intenta de nuevo.": "Something went wrong. Try again.",
    "¡Bienvenida! Eres de las primeras: tienes Plus gratis ⭐": "Welcome! You're one of the first: you get Plus for free ⭐", "Sin conexión. Intenta de nuevo.": "No connection. Try again.",
    "Tu sesión venció. Vuelve a entrar.": "Your session expired. Please log in again.", "¡Queda 1 solo lugar!": "Only 1 spot left!",
    // mensajes del servidor
    "Escribe tu nombre": "Type your name", "Revisa tu correo": "Check your email", "La contraseña debe tener al menos 8 caracteres": "The password must be at least 8 characters",
    "Ya existe una cuenta con ese correo. Inicia sesión.": "There's already an account with that email. Log in.", "Correo o contraseña incorrectos": "Wrong email or password",
    "Demasiados intentos. Espera 15 minutos.": "Too many attempts. Wait 15 minutes.", "Sesión vencida": "Session expired", "El código venció. Pide uno nuevo.": "The code expired. Request a new one.",
    "Código incorrecto": "Wrong code", "No encontré ese código": "I couldn't find that code", "El pago no está completo": "The payment isn't complete",
    "La suscripción no está activa": "The subscription isn't active", "No se encontró el pago": "Payment not found", "No se pudo confirmar el pago": "Couldn't confirm the payment",
    "No encontré tu suscripción": "I couldn't find your subscription", "No se pudo revisar la suscripción": "Couldn't check the subscription",
    "La suscripción de ese código ya no está activa": "The subscription for that code is no longer active",
    "No se pudo abrir el portal. Revisa que esté activado en Stripe.": "Couldn't open the portal.",
    // ----- Mi cuenta y Plus -----
    "Mi cuenta": "My account", "Mi Lista Plus": "My List Plus", "Mi Lista Plus ⭐": "My List Plus ⭐", "Cerrar sesión": "Log out",
    "Plus gratis (de las primeras)": "Free Plus (early member)", "Prueba gratis activa": "Free trial active", "Plus activo": "Plus active", "Sin suscripción": "No subscription",
    "Desbloquea Plus": "Unlock Plus", "Un momento…": "One moment…", "¡Ya tienes Plus! ⭐": "You've got Plus! ⭐",
    "Gracias por tu suscripción. Ya puedes usar todas las funciones.": "Thanks for subscribing. You can now use every feature.",
    "Guarda este código. Si tienes la app instalada o cambias de teléfono, toca Mi Lista Plus → escribe tu código.": "Save this code. If you have the app installed or change phones, tap My List Plus → type your code.",
    "Administrar suscripción": "Manage subscription", "Ver planes de Plus": "See Plus plans", "Para seguir usando la app, suscríbete a Plus.": "To keep using the app, subscribe to Plus.",
    "Desbloquea todo lo que hace más fácil tu súper.": "Unlock everything that makes grocery shopping easier.", "Plan anual": "Yearly plan", "Plan mensual": "Monthly plan",
    "Los planes todavía no están disponibles.": "Plans aren't available yet.", "Se renueva automáticamente y puedes cancelar cuando quieras.": "Renews automatically and you can cancel anytime.",
    "¿Ya pagaste? Escribe tu código": "Already paid? Type your code", "Usar código": "Use code", "Ya pagué: revisar otra vez": "I paid: check again",
    "¿Ya pagaste? Cierra y vuelve a abrir la app con internet; tu suscripción se revisa con tu cuenta.": "Already paid? Close and reopen the app with internet; your subscription is checked with your account.",
    "Ahora no": "Not now", "Tu código de Plus": "Your Plus code", "Copiado ✓": "Copied ✓", "Confirmando tu pago…": "Confirming your payment…",
    "No se pudo confirmar el pago. Si ya pagaste, escríbenos.": "Couldn't confirm the payment. If you already paid, contact us.",
    "Sin conexión. Vuelve a abrir la app con internet para confirmar tu pago.": "No connection. Reopen the app with internet to confirm your payment.",
    "Revisando tu código…": "Checking your code…", "No se pudo usar ese código.": "Couldn't use that code.", "Sin conexión. Intenta de nuevo con internet.": "No connection. Try again with internet.",
    "Abriendo tu suscripción…": "Opening your subscription…", "No se pudo abrir el portal.": "Couldn't open the portal.",
    "Escanea productos, categorías automáticas, enviar y descargar la lista": "Scan products, automatic categories, send and download the list",
    "Escanea lo que congelas y recibe un aviso antes de que venza": "Scan what you freeze and get a reminder before it expires",
    "Escanea tus recibos y lleva el gasto del mes": "Scan your receipts and track monthly spending", "La misma lista en los teléfonos de tu familia": "The same list on your family's phones",
    // descargas y mensajes
    "MI LISTA DEL SÚPER": "MY GROCERY LIST", "POR COMPRAR": "TO BUY", "EN EL CARRITO": "IN THE CART",
    "Día": "Day", "Gasto (USD)": "Spent (USD)", "TOTAL DEL MES": "MONTH TOTAL", "Número de compras": "Number of purchases", "Sí": "Yes", "No": "No",
  };

  // Textos con datos (números, nombres, fechas).
  const P = [
    [/^Faltan (\d+)$/, "$1 left"], [/^(\d+) en el carrito$/, "$1 in the cart"], [/^(\d+) unidades$/, "$1 units"],
    [/^Quitaste (\d+) productos$/, "You removed $1 items"], [/^Quitaste (.+)$/, "You removed $1"],
    [/^Cambiar categoría de (.+)$/, "Change category of $1"], [/^Marcar como pendiente: (.+)$/, "Mark as not bought: $1"], [/^Marcar como comprado: (.+)$/, "Mark as bought: $1"],
    [/^Agregar “(.+)”$/, "Add “$1”"], [/^En tu lista: (\d+) productos$/, "On your list: $1 items"], [/^(\d+) productos agregados$/, "$1 items added"], [/^Código (\d+)$/, "Code $1"],
    [/^No encontré el código (\S+)\. Escribe su nombre y la próxima vez se reconocerá solo\.$/, "I couldn't find code $1. Type its name and next time it will be recognized automatically."],
    [/^No encontré el código (\S+)\. Escribe su nombre\.$/, "I couldn't find code $1. Type its name."],
    [/^No se pudo buscar el código (\S+)\. Escribe su nombre\.$/, "Couldn't look up code $1. Type its name."],
    [/^Se agregaron (\d+) productos$/, "$1 items added"], [/^(\d+) productos para agregar a tu lista:$/, "$1 items to add to your list:"],
    [/^Quedan (\d+) días$/, "$1 days left"], [/^Venció hace (\d+) días$/, "Expired $1 days ago"], [/^(\d+) productos$/, "$1 items"],
    [/^Entró: (.+)$/, "Added: $1"], [/^usar antes del (.+)$/, "use before $1"], [/^Usar antes del (.+)$/, "Use before $1"],
    [/^Fecha: (.+)$/, "Date: $1"], [/^Expira: (.+)$/, "Expires: $1"], [/^Guardado en el freezer: (.+)$/, "Saved to the freezer: $1"], [/^No se guardó (.+)$/, "$1 was not saved"],
    [/^Marcar como usado y quitar: (.+)$/, "Mark as used and remove: $1"], [/^Leyendo: (.+)$/, "Reading: $1"],
    [/^vence en 3 días o menos:$/, "expires in 3 days or less:"], [/^vencen en 3 días o menos:$/, "expire in 3 days or less:"],
    [/^(.+) — vence (.+)$/, "$1 — expires $2"],
    [/^Este mes: (\d+) compras$/, "This month: $1 purchases"], [/^Este mes: 1 compra$/, "This month: 1 purchase"], [/^(\d+) compras registradas$/, "$1 purchases recorded"],
    [/^(.+), gastaste (.+)$/, "$1, you spent $2"], [/^Editar compra de (.+)$/, "Edit purchase of $1"], [/^Borrar compra de (.+)$/, "Delete purchase of $1"],
    [/^Borraste la compra de (.+)$/, "You deleted the purchase of $1"], [/^Compra registrada: (.+)$/, "Purchase added: $1"], [/^Recibo guardado: (.+)$/, "Receipt saved: $1"],
    [/^No hay compras registradas en (.+)\.$/, "No purchases recorded in $1."], [/^Mis Compras - (.+)$/, "My Purchases - $1"], [/^Resumen (.+)$/, "Summary $1"],
    [/^Es una lista compartida con (\d+) productos?\. Al unirte, tus productos pendientes se agregan a ella y los cambios se verán en todos los teléfonos en unos segundos\.$/, "It's a shared list with $1 item(s). When you join, your pending items are added to it and changes show on every phone within seconds."],
    [/^Te uniste a la lista compartida\. Se agregaron tus (\d+) productos\.$/, "You joined the shared list. Your $1 items were added."],
    [/^Te uniste a la lista compartida\. Se agregó tu producto\.$/, "You joined the shared list. Your item was added."],
    [/^Código: (.+)$/, "Code: $1"],
    [/^¡Gratis para las primeras (\d+)!$/, "Free for the first $1!"],
    [/^Regístrate ahora y, si estás entre las primeras (\d+), usas la app gratis para siempre\.$/, "Sign up now and, if you're among the first $1, you use the app free forever."],
    [/^Regístrate ahora y usa la app gratis para siempre\.$/, "Sign up now and use the app free forever."],
    [/^Quedan (\d+) de (\d+) lugares$/, "$1 of $2 spots left"], [/^Hola, (.+)$/, "Hi, $1"],
    [/^Te enviamos un código a (.+)\. Revisa también la carpeta de spam\.$/, "We sent a code to $1. Also check your spam folder."],
    [/^Pide tu código a soporte(.*) y escríbelo aquí\. Vence en 30 minutos\.$/, "Ask support for your code$1 and type it here. It expires in 30 minutes."],
    [/^(.+) es parte de Plus\.$/, "$1 is part of Plus."], [/^Desbloquea (.+)$/, "Unlock $1"],
    [/^eres la número (\d+)$/, "you're number $1"], [/^se renueva o vence el (.+)$/, "renews or ends on $1"],
    [/^(\d+) días gratis para probar\. Se renueva automáticamente y puedes cancelar cuando quieras\.$/, "$1-day free trial. Renews automatically and you can cancel anytime."],
    [/^Tu suscripción quedó unida a tu cuenta \((.+)\)\. Entra con tu correo en cualquier teléfono y la tendrás activa\.$/, "Your subscription is linked to your account ($1). Log in with your email on any phone and it will be active."],
    [/^¿Dudas\? Escríbenos a (.+)$/, "Questions? Write to us at $1"],
    [/^\$([\d.,]+) al mes$/, "$$$1 / month"], [/^\$([\d.,]+) al año$/, "$$$1 / year"], [/^Ahorra (\d+)%$/, "Save $1%"],
    [/^Versión (.+)$/, "Version $1"], [/^(\d+) de (\d+) lugares$/, "$1 of $2 spots"],
    [/^(.+) → (.+)$/, null], // se traducen las dos partes
  ];
  const NO_TRANSLATE = ".lang-switch button, .name, .fz-info > b, .acct-who b, .sh-code b, #shCode, .sc-last b, #fzDateProduct span, .ad-who, .pc-rec-info > b";

  function tr(s) {
    if (lang !== "en" || !s) return s;
    const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const core = m[2];
    if (!core) return s;
    return m[1] + trCore(core) + m[3];
  }
  function trCore(core) {
    if (Object.prototype.hasOwnProperty.call(D, core)) return D[core];
    for (const [re, rep] of P) {
      const mm = core.match(re);
      if (!mm) continue;
      if (rep === null) return core.split(" → ").map(trCore).join(" → ");
      return core.replace(re, rep).replace(/\$\d/g, x => x); // las partes con datos quedan igual
    }
    if (core.includes(" · ")) return core.split(" · ").map(p => trCore(p.trim())).join(" · ");
    // Frases que terminan con un mensaje conocido (por ejemplo, error de cámara + consejo).
    const sentences = core.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (sentences && sentences.length > 1 && sentences.join("") === core) {
      const parts = sentences.map(x => x.trim());
      const out = parts.map(p => D[p] || p);
      if (out.some((o, i) => o !== parts[i])) return out.join(" ");
    }
    return core;
  }
  // Partes de patrones que a su vez se traducen (ej. "Desbloquea Freezer Scan y Mis Compras").
  function deep(s) {
    return s.replace(/Mis Compras/g, "My Purchases").replace(/Lista compartida/g, "Shared list").replace(/ y /g, " and ")
      .replace(/Plus gratis \(de las primeras\)/g, "Free Plus (early member)");
  }

  /* ---------- traducir la pantalla ---------- */
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function skip(node) {
    const el = node.nodeType === 3 ? node.parentElement : node;
    if (!el) return true;
    if (el.closest("script, style, textarea")) return true;
    if (node.nodeType === 3 && el.matches(NO_TRANSLATE)) return true;
    return false;
  }
  function doText(n) {
    if (skip(n)) return;
    const v = n.nodeValue, t = tr(v);
    if (t !== v) n.nodeValue = /Desbloquea|→/.test(v) ? deep(t) : t;
  }
  function doEl(el) {
    if (el.nodeType !== 1 || el.closest("script, style")) return;
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const v = el.getAttribute(a), t = tr(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    doEl(root);
    const it = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n; while ((n = it.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
  }
  function start() {
    if (lang !== "en") return;
    walk(document.body);
    new MutationObserver(list => {
      for (const m of list) {
        if (m.type === "characterData") doText(m.target);
        else if (m.type === "attributes") doEl(m.target);
        else m.addedNodes.forEach(walk);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------- botón para cambiar de idioma ---------- */
  // Selector con los dos idiomas a la vista: el que está activo se ve resaltado.
  function addButtons() {
    const mk = cls => {
      const wrap = document.createElement("div");
      wrap.className = "lang-switch " + cls; wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", lang === "en" ? "Language" : "Idioma");
      [["es", "ES", "Español"], ["en", "EN", "English"]].forEach(([code, label, full]) => {
        const b = document.createElement("button");
        b.type = "button"; b.textContent = label; b.setAttribute("data-noi18n", "");
        b.setAttribute("aria-label", full); b.setAttribute("aria-pressed", String(lang === code));
        if (lang === code) b.className = "on";
        b.onclick = () => { if (lang !== code) toggle(); };
        wrap.append(b);
      });
      return wrap;
    };
    const top = document.querySelector(".top-right");
    if (top) top.insertBefore(mk("lang-top"), top.firstChild);
    const band = document.querySelector(".auth-band");
    if (band) band.append(mk("lang-auth"));
  }
  function toggle() {
    lang = lang === "en" ? "es" : "en";
    try { localStorage.setItem(KEY, lang); } catch {}
    location.reload(); // así todo, incluidas las fechas, se vuelve a dibujar en el idioma nuevo
  }

  window.I18N = {
    lang: () => lang,
    t: s => (lang === "en" ? (s.includes(" · ") || /Desbloquea|→/.test(s) ? deep(tr(s)) : tr(s)) : s),
    loc: () => (lang === "en" ? "en-US" : "es"),
    toggle,
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { addButtons(); start(); });
  else { addButtons(); start(); }
})();
