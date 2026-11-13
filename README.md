# V Campamento Interno
**Luces que brillan y sombras que acechan**

React + Vite · Netlify Functions · Google Sheets + Apps Script

## 1. Configurar Google Sheets

1. Crea una hoja de cálculo privada. Abre **Extensiones → Apps Script**.
2. Reemplaza el contenido del editor con el archivo `google/Code.gs`. Guarda y ejecuta **prepararCampamento** desde el selector de funciones. Acepta los permisos con tu cuenta de Google.
3. En la pestaña **Campistas**, agrega un campista por fila a partir de la fila 2. Usa `NumeroDocumento`, `Nombre`, `Apellidos`, `Qr1` … `Qr20`. Escribe documentos como texto, sin puntos ni espacios, y evita duplicados. Deja las columnas QR vacías para participantes nuevos. Si ya tienes los datos, pega las filas debajo de los encabezados. La aplicación guarda fecha y hora en la columna de cada QR registrado.
4. En **Configuración del proyecto → Propiedades de la secuencia de comandos**, copia el valor de `API_SECRET`. Se generó al preparar la hoja.
5. Selecciona **Implementar → Nueva implementación → Aplicación web**. En «Ejecutar como» elige **Yo** y en «Quién tiene acceso» elige **Cualquier persona**. Copia la URL que termina en `/exec`. La URL de Apps Script acepta peticiones de la función de Netlify con el secreto compartido. Mantén privada la hoja de cálculo y guarda el secreto exclusivamente en la configuración del servidor.

[Instrucciones oficiales de Apps Script](https://developers.google.com/apps-script/guides/web)

## 2. Publicar en Netlify

1. Descomprime el ZIP. Sube el contenido de la carpeta `campamento-qr` a un repositorio Git e impórtalo desde Netlify. Si la carpeta queda anidada en el repositorio, selecciona `campamento-qr` como directorio base.
2. En la configuración del sitio agrega estas variables de entorno para el entorno de producción y el ámbito **Functions**, si tu plan permite seleccionar el ámbito.

   | Variable | Valor |
   |---|---|
   | `APPS_SCRIPT_URL` | URL `/exec` del paso anterior |
   | `API_SECRET` | Valor de la propiedad del mismo nombre |

3. Despliega desde Netlify. El archivo `netlify.toml` configura la compilación y la función del servidor. Abre el sitio con HTTPS para usar la cámara. Si agregaste las variables después del primer despliegue, vuelve a desplegar.
4. Para probar todo localmente, instala Node.js 22, ejecuta `npm ci` y luego `npx netlify-cli dev`. Puedes guardar las dos variables en un archivo `.env` local. Usa la URL que indica Netlify Dev para que la función esté disponible.

[Variables de entorno de Netlify Functions](https://docs.netlify.com/build/functions/environment-variables/)

## 3. Imprimir y comprobar los códigos

1. Selecciona la pestaña **CodigosQR** y usa **Archivo → Descargar → Valores separados por comas (.csv, hoja actual)**. Guarda el archivo como `codigos.csv` en la raíz del proyecto.
2. Ejecuta `npm ci` y luego `node scripts/imprimir.mjs codigos.csv`. Abre `qr-para-imprimir.html` e imprime. También puedes usar tus propios códigos editando el contenido exacto en **CodigosQR**, con un valor distinto por fila.
3. Agrega una fila de prueba y entra usando el documento de prueba en ambos campos. Escanea un código, comprueba que aparezca «QR leído correctamente» y revisa la fecha en la hoja. Escanea el mismo código otra vez y verifica el aviso de duplicado. Cierra sesión para ver el podio. El mismo QR puede registrarse una vez por cada campista.

## Logo y podio

El logo adjunto ya está en `public/logo-cafeteros.jpeg`. Reemplázalo con el mismo nombre o cambia la ruta de la etiqueta `img` en `src/main.jsx`. El rojo principal se ajusta con `--red` en `src/style.css`.

El podio muestra hasta tres participantes con al menos un registro, con su nombre y la inicial del apellido. Ordena primero por cantidad y, en caso de empate, alfabéticamente. El acceso solicitado usa el documento como usuario y contraseña, así que quien conozca el número puede entrar como ese campista.
