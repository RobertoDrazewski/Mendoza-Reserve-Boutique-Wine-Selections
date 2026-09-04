# Guía de deploy — Mendoza Reserve

Esta guía te lleva paso a paso para poner el sitio en producción con:

- **Aiven** → base de datos MySQL (plan gratuito)
- **Railway** → hosting de la app (backend + frontend en un solo servicio)
- **Cloudflare** → DNS del dominio `mendoza-reserve.co.uk` (que ya tenés)
- **Resend** (opcional, recomendado) → envío de emails automáticos
- **OpenAI** (opcional) → chat con IA de seguimiento de pedido

Podés hacer todo esto vos mismo siguiendo cada paso. No hace falta tocar código: sólo copiar/pegar valores en cada panel.

---

## 0. Antes de empezar

Necesitás:

- Una cuenta en [aiven.io](https://aiven.io), [railway.app](https://railway.app) y [cloudflare.com](https://cloudflare.com) (podés crearlas gratis con tu email).
- Acceso al panel de DNS de `mendoza-reserve.co.uk` (donde compraste el dominio, para apuntarlo a Cloudflare si todavía no lo está).
- El código en GitHub: `https://github.com/RobertoDrazewski/Mendoza-Reserve-Boutique-Wine-Selections`

---

## 1. Base de datos — Aiven (MySQL gratis)

1. Entrá a [aiven.io](https://aiven.io) y creá una cuenta (o iniciá sesión).
2. **Create service** → elegí **MySQL**.
3. Plan: elegí el plan **Free** (o el más barato disponible en tu cuenta).
4. Cloud/región: cualquiera cercana a Europa (por los compradores UK) o la que te sugiera por defecto.
5. Nombre del servicio: `mendoza-reserve-db` (o el que prefieras).
6. Creá el servicio y esperá unos minutos a que el estado pase a **Running**.
7. Andá a la pestaña **Overview** del servicio. Ahí vas a ver los datos de conexión:
   - `Host`
   - `Port`
   - `User` (normalmente `avnadmin`)
   - `Password`
   - `Database name` (normalmente `defaultdb`)

   **Guardá estos 5 valores** — los vas a necesitar en el paso 3 (Railway).

   > Tus datos reales de conexión (Aiven, servicio `mysql-309d8fa4-drazewski-d6b4`):
   > `HOST=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com`, `PORT=25819`, `USER=avnadmin`.
   > Ya están cargados en `backend/.env` de este proyecto.

   **Importante — la base `mendoza_bodegas` todavía no existe.** Un servicio de Aiven MySQL viene
   solo con la base `defaultdb` creada por defecto; `mendoza_bodegas` (el nombre que vas a usar,
   ya seteado en `backend/.env`) hay que crearla antes de cargar el esquema. Dos formas:
   - **Desde la consola de Aiven**: pestaña **Databases** del servicio → **Create database** →
     nombre `mendoza_bodegas`.
   - **Desde la terminal**, conectándote a `defaultdb` primero:
     ```bash
     mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
       --database=defaultdb --ssl --default-character-set=utf8mb4 \
       -e "CREATE DATABASE IF NOT EXISTS mendoza_bodegas CHARACTER SET utf8mb4;"
     ```
     (usá `--ssl-mode=REQUIRED` en vez de `--ssl` si tu cliente es MySQL oficial y no MariaDB — ver más abajo).

9. Cargá el esquema y los datos en `mendoza_bodegas`. Tenés dos formas:

   **Opción A — con MySQL Workbench / TablePlus / DBeaver (recomendado si no usás la terminal):**
   Conectate al servicio con esos 5 datos (con SSL activado, base `mendoza_bodegas`) y ejecutá, en
   este orden, el contenido de:
   - `backend/sql/schema.sql`
   - `backend/sql/seed_bodegas.sql`
   - `backend/sql/update_bodega_images.sql`

   **Opción B — con la terminal**, si tenés `mysql` client instalado. Primero revisá qué cliente tenés
   (`mysql --version`): si dice **MariaDB**, el flag de SSL es `--ssl` en vez de `--ssl-mode=REQUIRED`.

   Con cliente **MySQL** oficial:
   ```bash
   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl-mode=REQUIRED --default-character-set=utf8mb4 < backend/sql/schema.sql

   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl-mode=REQUIRED --default-character-set=utf8mb4 < backend/sql/seed_bodegas.sql

   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl-mode=REQUIRED --default-character-set=utf8mb4 < backend/sql/update_bodega_images.sql
   ```

   Con cliente **MariaDB** (por ejemplo si lo instalaste con `brew install mariadb` en Mac):
   ```bash
   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl --default-character-set=utf8mb4 < backend/sql/schema.sql

   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl --default-character-set=utf8mb4 < backend/sql/seed_bodegas.sql

   mysql --host=mysql-309d8fa4-drazewski-d6b4.l.aivencloud.com --port=25819 --user=avnadmin -p \
     --database=mendoza_bodegas --ssl --default-character-set=utf8mb4 < backend/sql/update_bodega_images.sql
   ```
   La contraseña (`-p` te la va a pedir interactivamente) es la que ya está en `backend/.env`.

   **Importante**: usá siempre `--default-character-set=utf8mb4` (o el equivalente en tu cliente gráfico) — si no, los nombres con tildes ("Luján de Cuyo", etc.) se guardan mal.

10. Verificá que cargó bien: `SELECT COUNT(*) FROM bodegas;` debería devolver **144**.

   > **Nota:** esta sesión no tiene salida de red hacia el puerto de Aiven (25819), así que no pude
   > ejecutar este paso por vos. `backend/.env` en este workspace ya tiene cargados los 5 datos de
   > conexión de tu base real (los que me pasaste), así que solo te falta correr estos 3 comandos
   > una vez desde tu propia máquina (o pegar el contenido de los 3 archivos `.sql` en TablePlus/DBeaver).

Las 144 bodegas entran con estado `pendiente_contacto` (no se muestran en el sitio todavía). Las vas a ir activando desde el panel de administración a medida que te confirmen que quieren participar.

---

## 2. Emails — Resend (opcional pero recomendado)

Sin esto, el sitio funciona igual, pero los emails a las bodegas y a los compradores no se mandan (sólo quedan logueados en la consola del servidor).

1. Creá una cuenta en [resend.com](https://resend.com).
2. **Domains** → **Add Domain** → escribí `mendoza-reserve.co.uk`.
3. Resend te va a dar 2-3 registros DNS (tipo TXT/MX/CNAME) para verificar que sos dueño del dominio.
4. Cargá esos registros en Cloudflare (una vez que hayas hecho el paso 4 de esta guía, DNS → Add record, con los valores exactos que te dio Resend).
5. Esperá la verificación (puede tardar unos minutos a unas horas).
6. **API Keys** → **Create API Key** → copiá el valor (empieza con `re_...`). Lo vas a usar en Railway como `RESEND_API_KEY`.

---

## 3. La app — Railway

1. Entrá a [railway.app](https://railway.app) y creá una cuenta (podés entrar con GitHub).
2. **New Project** → **Deploy from GitHub repo** → elegí `Mendoza-Reserve-Boutique-Wine-Selections`.
   - Si no aparece, hacé click en **Configure GitHub App** y dale acceso a ese repositorio.
3. Railway va a crear un servicio y va a intentar hacer el build automáticamente (usa el `package.json` de la raíz del repo, que ya está preparado para instalar y armar el backend y el frontend juntos).
4. Andá a **Settings** del servicio y confirmá (o completá si hace falta):
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Root Directory**: `/` (la raíz del repo)
5. Andá a **Variables** y cargá estas variables de entorno (una por una, con **New Variable**):

   | Variable | Valor |
   |---|---|
   | `DB_HOST` | el `Host` de Aiven (paso 1) |
   | `DB_USER` | el `User` de Aiven |
   | `DB_PASSWORD` | el `Password` de Aiven |
   | `DB_NAME` | el `Database name` de Aiven |
   | `DB_PORT` | el `Port` de Aiven |
   | `DB_SSL` | `true` |
   | `JWT_SECRET` | un valor random largo — generalo en tu computadora con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `PORT` | `4000` (Railway igual expone el puerto que necesite; esta variable es la que usa el server internamente) |
   | `SITE_URL` | `https://mendoza-reserve.co.uk` (el dominio final, para los links de los emails) |
   | `RESEND_API_KEY` | tu API key de Resend (paso 2) — dejalo vacío si todavía no configuraste Resend |
   | `EMAIL_FROM` | `Mendoza Reserve <pedidos@mendoza-reserve.co.uk>` |
   | `OPENAI_API_KEY` | tu API key de [platform.openai.com/api-keys](https://platform.openai.com/api-keys) — dejalo vacío si todavía no querés activar el chat |
   | `OPENAI_MODEL` | `gpt-5.6-luna` (podés revisar modelos actuales en [developers.openai.com/api/docs/models](https://developers.openai.com/api/docs/models)) |
   | `ADMIN_NOTIFY_EMAIL` | `mendozareserve@gmail.com` — recibe el formulario de contacto y el aviso de nuevas consultas por chat |
   | `EXTRA_CORS_ORIGIN` | dejalo vacío por ahora (ver nota abajo) |

   **Nota sobre CORS**: el sitio sirve el frontend y la API desde el mismo servicio/dominio, así que no hace falta agregar nada especial en `EXTRA_CORS_ORIGIN` para que funcione — sólo la usarías si en el futuro separás el frontend a otro dominio.

6. Guardá las variables. Railway va a redeployar automáticamente.
7. Cuando el deploy termine (estado **Success**), Railway te va a dar una URL tipo `https://mendoza-reserve-production-xxxx.up.railway.app`. Abrila y confirmá que carga el sitio.

---

## 4. Dominio — Cloudflare

1. Entrá a [cloudflare.com](https://cloudflare.com) y creá una cuenta.
2. **Add a site** → escribí `mendoza-reserve.co.uk`.
3. Cloudflare va a escanear los registros DNS actuales y te va a dar 2 **nameservers** (algo como `xxx.ns.cloudflare.com`).
4. Andá al panel donde compraste el dominio (tu proveedor de dominios) y cambiá los nameservers a esos 2 que te dio Cloudflare. (Este paso puede tardar unas horas en propagar.)
5. Una vez que Cloudflare detecte el cambio (te avisa por email), volvé a Cloudflare → tu dominio → **DNS** → **Records**.
6. En Railway, andá a tu servicio → **Settings** → **Networking** → **Custom Domain** → escribí `mendoza-reserve.co.uk` (y otra vez para `www.mendoza-reserve.co.uk`). Railway te va a dar un registro **CNAME** para cada uno (algo como `xxxx.up.railway.app`).
7. En Cloudflare → **DNS** → **Add record**:
   - Tipo `CNAME`, nombre `@` (o `mendoza-reserve.co.uk`), destino el valor que te dio Railway, **Proxy status: Proxied** (nube naranja).
   - Repetí para `www`.
8. Esperá unos minutos y probá entrar a `https://mendoza-reserve.co.uk` — debería mostrar tu sitio con candado (HTTPS) válido.

---

## 5. Primer usuario administrador

Por seguridad, el registro público (`/registro`) siempre crea usuarios comprador (`cliente`) — nunca admin, ni aunque se lo pidas en el formulario. Para tener tu propio usuario admin:

1. Registrate normalmente en `https://mendoza-reserve.co.uk/registro` con tu email.
2. Conectate a la base de Aiven (con el cliente que uses) y ejecutá:
   ```sql
   UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-email@ejemplo.com';
   ```
3. Cerrá sesión y volvé a entrar en el sitio — ahora vas a ver el link **ADMIN** en el menú.

---

## 6. Smoke test post-deploy (checklist)

Una vez que todo esté conectado, probá en orden:

- [ ] `https://mendoza-reserve.co.uk/` carga con HTTPS válido (candado verde).
- [ ] `https://mendoza-reserve.co.uk/api/health` devuelve `{"status":"online",...}`.
- [ ] `/bodegas` carga (puede estar vacío si todavía no activaste ninguna).
- [ ] Podés registrarte y loguearte.
- [ ] Con tu usuario admin, entrás a `/admin` y ves las 144 bodegas.
- [ ] Activás una bodega de prueba y le cargás un vino desde **Catálogo de vinos**.
- [ ] Esa bodega aparece en `/bodegas` y `/vinos` para un usuario no-admin.
- [ ] Hacés un pedido de prueba (con otro usuario comprador) y llega a `/seguimiento/...`.
- [ ] Si configuraste Resend: te llega el email a la casilla de la bodega (usá tu propio email como email de prueba de la bodega antes de activarla de verdad).
- [ ] El link del email `/bodega/pedido/:token` te deja confirmar el pedido.
- [ ] Si configuraste OpenAI: el chat de `/seguimiento` responde preguntas sobre el pedido.

---

## 7. Operación del día a día

- **Activar una bodega**: `/admin` → pestaña **Bodegas** → cambiar el estado a `activa` en el desplegable de esa fila. Ahí aparece fecha de activación automáticamente.
- **Cargar el catálogo de una bodega**: `/admin` → pestaña **Catálogo de vinos** → elegís la bodega → **+ Agregar vino**.
- **Ver pedidos y comisiones**: `/admin` → pestaña **Pedidos y comisiones**. Ahí ves subtotal, comisión calculada y podés marcar la comisión como `facturada` / `pagada` a medida que la cobrás (esto es sólo informativo — la plataforma no cobra el dinero, vos facturás aparte).
- **Cargar leads de compradores UK**: `/admin` → pestaña **Leads UK (CRM)** → alta manual o **Importar CSV** (encabezados: `nombre_contacto,negocio,tipo,email,telefono,ciudad,sitio_web,notas`).

---

## 8. Actualizar el sitio más adelante

Cualquier cambio que subas a la rama `main` de GitHub, Railway lo redeploya automáticamente (build + start, como configuraste en el paso 3). No hace falta tocar nada más.

Si en algún momento cambiás el modelo del chat con IA (por ejemplo porque OpenAI lanza uno nuevo), sólo actualizá la variable `OPENAI_MODEL` en Railway — no hace falta tocar código.
