# Mi lista del súper

Lista de compras para el teléfono: apuntas la cámara al código de barras, la app identifica el producto y lo agrega sola a tu lista. La lista se guarda en el teléfono y la app funciona aunque no tengas señal dentro de la tienda.

No necesita instalar nada ni compilar: es una carpeta con archivos listos para subir.

## Publicarla

La cámara solo funciona en sitios seguros (https), por eso hay que subirla a un servicio como Netlify. Es gratis.

### Opción rápida: Netlify Drop (sin GitHub)

1. Descomprime el archivo `mi-lista-super.zip` en tu computadora.
2. Entra a https://app.netlify.com/drop e inicia sesión o crea una cuenta.
3. Arrastra la carpeta `mi-lista-super` completa a la página.
4. En unos segundos te da una dirección como `https://nombre-raro-123.netlify.app`. Esa es tu app.
5. Opcional: en **Site configuration → Change site name** puedes cambiarla a algo como `mi-lista-super.netlify.app`.

Para actualizarla más adelante, en tu sitio de Netlify ve a **Deploys** y arrastra la carpeta nueva.

### Opción con GitHub (se actualiza sola)

1. Crea una cuenta en https://github.com y un repositorio nuevo, por ejemplo `mi-lista-super`.
2. En el repositorio toca **Add file → Upload files** y arrastra *el contenido* de la carpeta (index.html, sw.js, las carpetas css, js, icons, etc.), no la carpeta de afuera. Toca **Commit changes**.
3. Entra a https://app.netlify.com, toca **Add new site → Import an existing project → GitHub** y elige el repositorio.
4. No cambies nada en la configuración (el archivo `netlify.toml` ya lo dice todo) y toca **Deploy**.

Desde entonces, cada vez que subas un cambio a GitHub, Netlify publica la nueva versión sola.

## Instalarla en el teléfono

**iPhone (Safari):** abre la dirección de tu app, toca el botón **Compartir** (el cuadro con la flecha) y luego **Agregar a inicio**. Tiene que ser en Safari.

**Android (Chrome):** abre la dirección, toca **Instalar** en la parte de arriba de la app o el menú ⋮ → **Instalar app**.

Queda un ícono propio en tu pantalla de inicio y se abre a pantalla completa, como cualquier app. La primera vez que escanees, el teléfono te pedirá permiso para usar la cámara: toca **Permitir**.

## Cómo funciona

**Escanear.** Toca *Escanear producto* y pon el código de barras dentro del recuadro. Cuando lo lee, suena un bip, vibra y el producto aparece abajo con la opción de deshacer. Puedes seguir escaneando uno tras otro y tocar *Listo* al terminar. Si el código está dañado, usa *Teclear código*. En lugares oscuros aparece un botón de linterna (en los teléfonos que lo permiten).

**Identificar.** La app busca el código en las bases de datos públicas de Open Food Facts, Open Products Facts y Open Beauty Facts, que tienen millones de productos de Estados Unidos, México y otros países. Si un producto no aparece, la app te pide su nombre una sola vez y lo recuerda: la próxima vez que lo escanees se reconoce al instante, incluso sin internet.

**Sin señal.** Si escaneas sin internet, el producto se agrega con su código y se identifica solo en cuanto vuelve la conexión. Los productos que ya escaneaste antes se reconocen sin internet.

**Comprar.** Toca el círculo o el nombre del producto para marcarlo como comprado. Con *Quitar comprados* limpias la lista, y puedes deshacerlo si fue sin querer.

**Agregar por nombre.** Escribe el nombre del producto en la barra *Agregar por nombre* (por ejemplo, "Swiss Cheese") y toca *Agregar*.

**Descargar la lista.** Toca *Descargar* para guardar tu lista como archivo de texto, con lo que falta por comprar y lo que ya está en el carrito. En Android queda en *Descargas*; en iPhone se abre el menú de compartir y eliges *Guardar en Archivos*.

**Enviar la lista.** Toca *Enviar lista* y elige WhatsApp (o cualquier app de mensajes). La otra persona recibe la lista escrita para leerla directo en el chat, y un enlace: si lo abre, la app le pregunta si quiere agregar esos productos a su lista para ir marcándolos en la tienda. En iPhone, conviene copiar ese enlace y abrirlo en Safari.

**Categorías automáticas.** Cada producto que agregas (escaneado o escrito) se acomoda solo en su categoría: Frutas y verduras, Carnes, Lácteos, Panadería, Despensa, Congelados, Bebidas, Botanas y dulces, Limpieza y hogar, Cuidado personal, Bebé y mascotas u Otros. Funciona en español e inglés (leche o milk → Lácteos, pollo o chicken → Carnes). Si alguno queda en la categoría equivocada, toca su imagen y elige la correcta: la app se acuerda para la próxima vez.

**Productos comunes.** Al tocar *Agregar por nombre* aparecen productos comunes para agregarlos con un toque. Al escribir, la app sugiere productos que coinciden, en español o inglés (por ejemplo "chick" → Chicken, Chicken breast…).

**Lista compartida en tiempo real.** Toca *Lista compartida* → *Compartir mi lista* y envía la invitación por WhatsApp. La otra persona abre el enlace (o, en *Lista compartida*, toca *Me invitaron: tengo un código* y lo escribe) y ve la misma lista. Si cualquiera agrega, quita o marca un producto, el cambio aparece en los demás teléfonos en unos segundos. Sin señal, los cambios se guardan y se envían al volver la conexión. Con *Salir de la lista compartida* cada quien se queda con su copia.

**Mis Compras.** En Mi lista, toca *Mis Compras* para abrir el calendario de tus visitas al súper:

1. Toca el día en que fuiste y luego *Registrar compra*. Escribe cuánto gastaste, la tienda si quieres, y sube la foto del recibo (puedes tomarla en ese momento o elegirla de tus fotos).
2. Arriba se suma solo el **TOTAL GASTADO DEL MES**. En el calendario, cada día con compras muestra cuánto gastaste.
3. Con las flechas cambias de mes para consultar los meses anteriores. Todo queda guardado en el teléfono.
4. Con el lápiz editas una compra (monto, fecha, tienda, cambiar o quitar la foto) y con el bote de basura la borras (con opción de deshacer). Toca la foto para verla en grande.
Debajo del total del mes aparecen, lado a lado, las dos formas de guardar un recibo: **Escanear recibo** y **Tomar foto**.

5. **Tomar foto:** si solo quieres guardar la foto del recibo como respaldo, toca *Tomar foto*. Se abre el registro de compra con la foto ya puesta; tú escribes el total.
6. **Escanear recibo** (funciona mejor con recibos de hasta 20 productos): toca *Escanear recibo* y toma una foto del recibo completo (o elígela de tus fotos). La app lee la tienda, la fecha, cada producto con su precio y el total, y te lo muestra para que corrijas lo que haga falta: puedes cambiar nombres y precios, quitar o agregar productos y ajustar el total. Si la suma de productos no coincide con el total, te muestra la diferencia: si es parecida a los impuestos del recibo dice *Impuestos y otros*, y si es mayor te avisa que hay *productos no leídos*. El total del recibo siempre se guarda completo. Al tocar *Guardar compra* se registra en el día del recibo, se suma al total del mes y la foto queda guardada como respaldo. Después puedes volver a ver y corregir los productos desde el lápiz → *Ver y corregir productos*. Consejo: pon el recibo sobre una superficie oscura, estirado y con buena luz.
7. *Descargar resumen mensual* guarda un archivo (.csv) con cada fecha de compra, lo que gastaste y el total del mes. Se abre en Excel, Google Sheets o Numbers.

**Freezer Scan.** Toca el botón *❄️ Freezer* arriba a la derecha. Ahí llevas la cuenta de lo que tienes congelado, aparte de Mi lista:

1. Toca *Empezar* y escanea el código de barras del producto (o usa *Sin código de barras* para carne del carnicero o comida hecha en casa). Si la cámara en vivo no lo lee, toca *Tomar foto*: una foto sale más nítida y se lee mejor.
2. Se abre un segundo escáner, solo para la fecha. Apunta a la fecha impresa dentro del recuadro. Abajo vas viendo lo que está leyendo ("Leyendo: …") para que sepas si estás bien apuntada. Reconoce si dice **Freeze By, Sell By, Use By o Best By**. Cuando la lee dos veces igual, te la muestra para que confirmes con *Usar* o toques *Reintentar*.
3. Si en 20 segundos no encuentra una fecha, propone **la fecha de hoy como entrada al freezer**, y ese producto se cuenta para usarse dentro de 3 meses. También puedes tocar *Tomar foto* o *Escribir fecha*.
4. El producto queda guardado con su nombre, el tipo y la fecha, los días que faltan y una barra de color. La lista se ordena sola: arriba lo que vence antes, marcado con **Usar primero**.
5. Tres días antes de la fecha recibes un aviso en el teléfono (ver *Avisos del freezer* abajo).
6. Cuando lo uses, toca *Usado* y se quita de la lista (con opción de deshacer).

El lector de fechas funciona sin internet. La primera vez tarda unos segundos en prepararse. Las fechas de puntitos a veces se leen con algún número cambiado (un 0 como 8, por ejemplo); la app corrige los errores más comunes, pero revisa siempre la fecha antes de tocar *Usar*.

**Guardado.** La lista se guarda en el teléfono, así que sigue ahí aunque cierres la app o reinicies el teléfono. Ten en cuenta que vive solo en ese teléfono: si borras los datos del navegador o desinstalas la app, se borra la lista.

## Avisos del freezer

Para que los avisos lleguen aunque la app esté cerrada, la app usa unas pequeñas funciones de servidor en Netlify (carpeta `netlify/`). No hay que configurar nada: las claves se crean solas la primera vez.

1. **Tiene que estar publicada con GitHub + Netlify.** Con *Netlify Drop* (arrastrar la carpeta) las funciones no se instalan; en ese caso los avisos solo aparecen al abrir la app.
2. **En el teléfono**, abre Freezer Scan y toca *Activar avisos*, luego *Permitir*.
   - **iPhone:** necesita iOS 16.4 o más nuevo y la app instalada en la pantalla de inicio (abierta desde el ícono, no desde Safari).
   - **Android:** funciona desde Chrome o con la app instalada.
3. Los avisos se revisan cada hora y llegan a partir de las 9 de la mañana (tu hora), una vez por producto.

Para comprobar que las funciones quedaron publicadas: en Netlify entra a tu sitio → **Logs → Functions**. Deben aparecer `push-key`, `freezer-sync` y `freezer-notify`.

Solo se guarda en el servidor lo necesario para avisarte: el nombre y la fecha de cada producto del freezer. Mi lista nunca sale del teléfono.

## Lista compartida

La lista compartida usa solo **Netlify**, sin servicios extra ni costo adicional. No hay que configurar nada: funciona sola cuando la app está publicada desde GitHub en Netlify (con *Netlify Drop* no, porque ahí no se instalan las funciones del servidor).

Cómo trabaja: la lista se guarda en tu sitio de Netlify, y cada teléfono revisa cada 3 segundos si hubo cambios mientras la app está abierta (cada 8 segundos si nadie ha cambiado nada en un par de minutos). Con la app cerrada o en segundo plano no revisa, para no gastar. Si dos personas cambian la lista al mismo tiempo, no se pierde ningún cambio.

Para una familia es más que suficiente. Si algún día muchas familias la usan a la vez, revisa en Netlify el consumo de funciones; si se acerca al límite gratis, se puede pasar la lista a un servicio en vivo (por ejemplo Supabase).

**En iPhone:** la app instalada en la pantalla de inicio y Safari guardan cosas por separado. Si alguien ya tiene la app instalada, es mejor que se una escribiendo el **código** dentro de la app, en vez de abrir el enlace en Safari.

## Cuentas (registro obligatorio)

Para usar la app hay que crear una cuenta con **nombre, correo y contraseña**. Las contraseñas se guardan cifradas en tu sitio de Netlify (nunca se pueden leer), y la sesión queda abierta en el teléfono, así que la app funciona sin señal una vez que entraste. Se activa o desactiva con `authRequired` en `js/plus-config.js`.

**Lo que haces una vez en Netlify** (tu sitio → **Site configuration → Environment variables → Add a variable**):

| Variable | Para qué | ¿Obligatoria? |
|---|---|---|
| `ADMIN_PASSWORD` | Contraseña de tu panel de cuentas (mínimo 10 caracteres, que no uses en otro lado) | Sí |
| `FOUNDERS_LIMIT` | Cuántas de las primeras cuentas tienen la app gratis. Si no la pones, son 5 | No |
| `RESEND_API_KEY` y `MAIL_FROM` | Para enviar por correo el código de "Olvidé mi contraseña" (con una cuenta gratis de resend.com). Sin esto, el código lo ves tú en el panel y se lo das | No |

Después de agregarlas: **Deploys → Trigger deploy**.

**Tu panel de cuentas:** abre `https://TU-APP.netlify.app/admin.html` y escribe tu `ADMIN_PASSWORD`. Ves cuántas cuentas hay, quiénes son fundadoras, quiénes pagan, puedes buscar y descargar la lista en Excel. Si alguien olvidó su contraseña y pidió un código, aparece ahí en rojo para que se lo des.

**Las primeras 5 son gratis.** El servidor cuenta las cuentas en el orden en que se registran; las primeras 5 (o lo que diga `FOUNDERS_LIMIT`) tienen todo gratis para siempre. **Ojo:** tus propias cuentas de prueba también cuentan. Si tú te registras primero, pon `FOUNDERS_LIMIT` en 6 para que queden 5 lugares para tus clientas.

**Privacidad:** como ahora guardas nombre y correo de tus usuarias, necesitas una política de privacidad que lo explique.

## Activar Mi Lista Plus (suscripción con Stripe)

La app ya trae el sistema de suscripción, **apagado**. Mientras esté apagado, todas las personas con cuenta usan la app gratis. Está configurada como pediste: **toda la app** se paga (`features: ["todo"]`) a **$5.99 al mes**, y las primeras 5 cuentas no pagan. Si prefieres cobrar solo algunas funciones, cambia `features` en `js/plus-config.js` (por ejemplo `["freezer", "compras"]`).

Con cuentas, el pago queda **unido a la cuenta** de la clienta: la app manda su número de cuenta y su correo a Stripe al pagar, y luego Plus se activa en cualquier teléfono donde entre con su correo. No necesita ningún código.

Hazlo primero en **modo de prueba** de Stripe (Test mode) y, cuando todo funcione, repítelo en modo real.

1. **Producto y precios.** En Stripe → **Product catalog → Add product**: nombre *Mi Lista Plus*. Agrega un precio **recurrente mensual** y otro **recurrente anual** con los montos que decidiste.
2. **Enlaces de pago.** **Payment Links → New**, uno por cada precio. Si das prueba gratis, actívala ahí (mismos días para los dos). En **After payment** elige **Don't show confirmation page / redirigir a tu sitio** y pega esta dirección, cambiando el principio por la de tu app:
   `https://TU-APP.netlify.app/?plus_session={CHECKOUT_SESSION_ID}`
   (Escribe `{CHECKOUT_SESSION_ID}` tal cual, con las llaves: Stripe lo cambia solo por el número del pago.)
3. **Portal de clientes.** **Settings → Billing → Customer portal**: actívalo y permite cancelar la suscripción y cambiar la tarjeta (y cambiar de plan, si quieres).
4. **Clave restringida.** **Developers → API keys → Create restricted key**. Ponle nombre *Mi Lista Netlify* y da solo estos permisos:
   - Checkout Sessions: **Read**
   - Subscriptions: **Read**
   - Customers: **Write**
   - Customer portal: **Write**
   Todo lo demás en *None*. Copia la clave (empieza con `rk_test_` o `rk_live_`).
5. **Pégala en Netlify, no en GitHub.** En Netlify → tu sitio → **Site configuration → Environment variables → Add a variable**: nombre `STRIPE_SECRET_KEY`, valor tu clave. Luego **Deploys → Trigger deploy** para que la tome.
6. **Configura la app.** En `js/plus-config.js` pega tu enlace de pago mensual en `monthly.link` (el anual es opcional; si no lo usas, déjalo vacío), revisa el precio que se muestra (`"$5.99 al mes"`), los días de prueba, tu correo de soporte, y cambia `enabled: false` por `enabled: true`. Sube el cambio a GitHub.
7. **Prueba.** Abre la app, toca **Mi Lista Plus**, elige un plan y paga con la tarjeta de prueba `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. Al terminar, Stripe te regresa a la app con Plus activo y un **código de 12 letras**. Prueba también **Administrar suscripción** y cancelar.
8. **Pasar a cobrar de verdad.** Repite los pasos 1 a 5 en modo real (enlaces y clave `rk_live_`), reemplaza la variable `STRIPE_SECRET_KEY` en Netlify y los enlaces en `js/plus-config.js`.

**El código de Plus** (solo si apagas las cuentas con `authRequired: false`). Cada clienta recibe un código al pagar. Con él desbloquea Plus en la app instalada o en otro teléfono (**Mi Lista Plus → ¿Ya pagaste? Escribe tu código**). Esto es importante en iPhone: el pago se abre en Safari, y la app instalada guarda sus datos aparte, así que ahí se desbloquea con el código. Si alguien lo pierde, lo encuentras en Stripe → **Customers** → la clienta → **Metadata**, como `codigo_mi_lista`.

**Si cancelan:** Plus sigue activo hasta el final del periodo pagado y luego se bloquea. Sus datos no se borran; si vuelve a pagar, recupera todo.

## ¿Cómo sé que tengo la versión nueva?

Al final de la página *Mis Compras* aparece el número de versión (por ejemplo, *Versión 1.9.0*). Si ves un número anterior o no aparece, cierra la app por completo y ábrela otra vez (dos veces si hace falta).

## Cambiar algo después

Si modificas cualquier archivo, abre `sw.js` y cambia el número de `VERSION` (por ejemplo de `v1.0.0` a `v1.0.1`). Así los teléfonos saben que hay una versión nueva. La actualización se aplica la segunda vez que abras la app.

## Archivos

```
index.html              Pantalla de la app
manifest.webmanifest    Nombre, ícono y colores para instalarla
sw.js                   Permite abrirla sin internet
netlify.toml            Configuración para Netlify
css/styles.css          Diseño
js/app.js               Lista, escáner y pantallas
js/scanner.js           Lectura del código de barras con la cámara
js/products.js          Identificación del producto por código
js/categorias.js        Categorías automáticas y productos comunes (español e inglés)
js/compartir.js         Lista compartida en tiempo real
netlify/functions/list-*  Funciones que guardan la lista compartida
js/plus.js              Mi Lista Plus: bloqueo de funciones y desbloqueo con Stripe
js/plus-config.js       Aquí activas el registro y Plus, y pegas tus enlaces de pago y precios
js/cuenta.js            Registro, inicio de sesión y "olvidé mi contraseña"
admin.html              Tu panel de cuentas (protegido con ADMIN_PASSWORD)
netlify/functions/auth-*  Funciones de las cuentas
netlify/functions/plus-*  Funciones que confirman pagos con Stripe
js/compras.js           Mis Compras: calendario, gastos y fotos de recibos
js/recibo.js            Mis Compras: lectura de recibos (tienda, fecha, productos, total)
js/freezer.js           Freezer Scan: pantalla, pasos y avisos
js/freezer-date.js      Freezer Scan: lector de fechas con la cámara
vendor/zxing.min.js     Lector de códigos de barras (para iPhone y navegadores sin lector propio)
vendor/tesseract/       Lector de texto para las fechas (funciona sin internet)
netlify/                Funciones del servidor para los avisos del freezer
package.json            Librerías que usan esas funciones
fonts/                  Tipografía
icons/                  Íconos de la app
```

## Créditos

Datos de productos de [Open Food Facts](https://world.openfoodfacts.org), bajo licencia Open Database License. Lector de códigos [ZXing](https://github.com/zxing-js/library), licencia Apache 2.0 (ver `vendor/ZXING-LICENSE`). Lector de texto [Tesseract.js](https://github.com/naptha/tesseract.js), licencia Apache 2.0. Tipografía Bricolage Grotesque, licencia SIL Open Font License (ver `fonts/OFL-LICENSE`).
