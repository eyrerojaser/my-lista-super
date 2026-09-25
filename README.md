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
