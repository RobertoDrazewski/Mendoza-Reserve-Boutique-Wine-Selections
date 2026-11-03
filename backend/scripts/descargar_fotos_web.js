/**
 * descargar_fotos_web.js
 *
 * Para las bodegas SIN foto válida que tienen "sitio_web" cargado, entra a su página, busca la mejor
 * imagen (og:image / twitter:image / imágenes del encabezado), la DESCARGA y la guarda en la carpeta de
 * fotos del servidor (IMAGES_DIR/bodegas), y actualiza el campo "imagen". Así la foto queda en tu propio
 * servidor y no se rompe si la bodega cambia su web.
 *
 * - Ignora las bodegas "rechazada" y las que ya tienen foto (que se ve).
 * - Descarta íconos y favicons: la imagen debe tener al menos 300 px de ancho (prefiere 800 px o más).
 * - Por defecto es SIMULACRO: muestra qué imagen y de qué tamaño encontró, sin guardar nada.
 * - Con --aplicar guarda los archivos y actualiza la base.
 *
 * Opciones:
 *   --aplicar              guarda de verdad
 *   --ids=6,8,26           procesa solo esas bodegas (por ID)
 *   --excluir=53,109       procesa todas menos esas
 *   --sin-verificar-ssl    para webs con certificado mal armado (solo lee páginas e imágenes públicas)
 *
 * IMPORTANTE: IMAGES_DIR tiene que apuntar a un volumen PERSISTENTE en Coolify; si no, las fotos se
 * pierden en el próximo deploy.
 *
 * Uso (desde backend/, dentro del contenedor, que tiene salida a internet):
 *   node scripts/descargar_fotos_web.js
 *   node scripts/descargar_fotos_web.js --aplicar --ids=8,26,81
 */
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const MIN_BYTES = 8 * 1024;          // menos que esto suele ser un ícono o un pixel
const MAX_BYTES = 8 * 1024 * 1024;
const ANCHO_BUENO = 800;
const ANCHO_MINIMO = 300;
const EXT_POR_TIPO = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

const decodificar = (s) => String(s).replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Devuelve las URLs de imagen candidatas de un HTML, de mejor a peor.
function extraerCandidatos(html, base) {
    const out = [];
    const agregar = (u) => {
        if (!u || /^data:/i.test(u)) return;
        try {
            const abs = new URL(decodificar(u).trim(), base).href;
            if (/^https?:/i.test(abs) && !/\.(svg|ico|gif)(\?|$)/i.test(abs) && !out.includes(abs)) out.push(abs);
        } catch (e) { /* url inválida */ }
    };
    const metas = html.match(/<meta\b[^>]*>/gi) || [];
    const meta = (clave) => metas
        .filter((m) => new RegExp(`(property|name)\\s*=\\s*["']${clave}["']`, 'i').test(m))
        .map((m) => (m.match(/content\s*=\s*["']([^"']+)["']/i) || [])[1]);
    ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'].forEach((k) => meta(k).forEach(agregar));
    const links = html.match(/<link\b[^>]*>/gi) || [];
    links.filter((l) => /rel\s*=\s*["']image_src["']/i.test(l)).forEach((l) => agregar((l.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]));
    // JSON-LD: "image": "https://..."
    (html.match(/"image"\s*:\s*"([^"]+)"/gi) || []).slice(0, 3).forEach((m) => agregar((m.match(/:\s*"([^"]+)"/) || [])[1]));
    // Fondos CSS en línea: url(...) con extensión de imagen
    (html.match(/url\(\s*["']?([^"')]+\.(?:jpe?g|png|webp|avif)[^"')]*)["']?\s*\)/gi) || []).slice(0, 8)
        .forEach((m) => agregar((m.match(/url\(\s*["']?([^"')]+)/i) || [])[1]));
    // <img> y <source srcset>: primero las que parecen portada, luego las demás.
    const imgs = html.match(/<img\b[^>]*>/gi) || [];
    const urlImg = (t) => (t.match(/(?:data-src|data-lazy-src|src)\s*=\s*["']([^"']+)["']/i) || [])[1];
    imgs.filter((t) => /(hero|banner|slider|header|portada|cover|bodega|vinedo|winery|estate|home)/i.test(t)).slice(0, 6).forEach((t) => agregar(urlImg(t)));
    imgs.slice(0, 14).forEach((t) => agregar(urlImg(t)));
    // Íconos grandes como último recurso (el filtro de tamaño los descarta si son chicos).
    links.filter((l) => /rel\s*=\s*["']apple-touch-icon/i.test(l)).forEach((l) => agregar((l.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]));
    return out;
}

// Ancho y alto de PNG / JPEG / WebP leyendo solo el encabezado (sin librerías).
function dimensiones(buf) {
    try {
        if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
        if (buf[0] === 0xff && buf[1] === 0xd8) {
            let i = 2;
            while (i < buf.length - 9) {
                if (buf[i] !== 0xff) { i += 1; continue; }
                const m = buf[i + 1];
                if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
                i += 2 + buf.readUInt16BE(i + 2);
            }
        }
        if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
            const t = buf.toString('ascii', 12, 16);
            if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
            if (t === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
            if (t === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }; }
        }
    } catch (e) { /* encabezado raro */ }
    return null; // AVIF u otro: tamaño desconocido
}

async function pedir(url, opciones = {}, ms = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
        return await fetch(url, { redirect: 'follow', signal: controller.signal, ...opciones, headers: { 'User-Agent': UA, 'Accept-Language': 'es,en;q=0.8', ...(opciones.headers || {}) } });
    } finally { clearTimeout(timer); }
}

async function leerLimitado(res, max) {
    const chunks = [];
    let total = 0;
    for await (const c of res.body) {
        total += c.length;
        if (total > max) return null;
        chunks.push(c);
    }
    return Buffer.concat(chunks);
}

async function descargarImagen(url, referer) {
    const res = await pedir(url, { headers: { Referer: referer, Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } }, 20000);
    if (!res.ok) return null;
    const tipo = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = EXT_POR_TIPO[tipo];
    if (!ext) return null;
    const buf = await leerLimitado(res, MAX_BYTES);
    if (!buf || buf.length < MIN_BYTES) return null;
    return { buf, ext, tipo, dim: dimensiones(buf) };
}

// Elige la mejor imagen de la página: la primera con ancho >= 800; si no hay, la más ancha con >= 300.
async function mejorImagen(cands, referer) {
    let mejor = null;
    for (const url of cands.slice(0, 10)) {
        let img = null;
        try { img = await descargarImagen(url, referer); } catch (e) { img = null; }
        if (!img) continue;
        const w = img.dim ? img.dim.w : ANCHO_BUENO; // tamaño desconocido (avif): se acepta
        const h = img.dim ? img.dim.h : ANCHO_BUENO;
        if (w < ANCHO_MINIMO || h < 150) continue;
        if (w >= ANCHO_BUENO) return { url, ...img };
        if (!mejor || w > (mejor.dim ? mejor.dim.w : 0)) mejor = { url, ...img };
    }
    return mejor;
}

module.exports = { extraerCandidatos, dimensiones, descargarImagen, mejorImagen, pedir };

if (require.main === module) {
    const pool = require('../config/db');
    const aplicar = process.argv.includes('--aplicar');
    if (process.argv.includes('--sin-verificar-ssl')) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const lista_ = (nombre) => ((process.argv.find((a) => a.startsWith(`--${nombre}=`)) || '').split('=')[1] || '').split(',').map((x) => x.trim()).filter(Boolean);
    const soloIds = lista_('ids');
    const excluir = lista_('excluir');
    const IMAGES_DIR = process.env.IMAGES_DIR ? path.resolve(process.env.IMAGES_DIR) : path.join(__dirname, '..', 'images');
    const UPLOADS_DIR = path.join(IMAGES_DIR, 'bodegas');
    const PUBLIC_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');
    const BUILD_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'build', 'images');
    const listar = (d) => { try { return fs.readdirSync(d); } catch (e) { return []; } };

    (async () => {
        const [rows] = await pool.query('SELECT id, nombre, estado, imagen, sitio_web FROM bodegas ORDER BY id');
        const locales = new Set([...listar(PUBLIC_IMAGES), ...listar(BUILD_IMAGES)]);
        const subidas = new Set(listar(UPLOADS_DIR));
        const sinFoto = (r) => {
            const img = (r.imagen || '').trim();
            if (!img) return true;
            if (/^https?:\/\//i.test(img)) return false;
            if (img.startsWith('bodegas/')) return !subidas.has(img.slice('bodegas/'.length));
            return !locales.has(img);
        };
        let lista = rows.filter((r) => r.estado !== 'rechazada' && sinFoto(r));
        if (soloIds.length) lista = lista.filter((r) => soloIds.includes(String(r.id)));
        if (excluir.length) lista = lista.filter((r) => !excluir.includes(String(r.id)));
        const conWeb = lista.filter((r) => (r.sitio_web || '').trim());
        const sinWeb = lista.filter((r) => !(r.sitio_web || '').trim());
        console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO'} | sin foto válida (sin contar rechazadas): ${lista.length} | con sitio web: ${conWeb.length} | sin sitio web: ${sinWeb.length}`);
        if (aplicar) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log(`Carpeta de destino: ${UPLOADS_DIR}\n`);

        const resultados = [];
        const procesar = async (b) => {
            let web = b.sitio_web.trim();
            if (!/^https?:\/\//i.test(web)) web = `https://${web}`;
            const r = { id: b.id, nombre: b.nombre, web, estado: 'sin imagen utilizable', imagen: '' };
            try {
                const res = await pedir(web);
                if (!res.ok) { r.estado = `la web respondió HTTP ${res.status}`; resultados.push(r); console.log(`NO   #${b.id} ${b.nombre}  (${r.estado})`); return; }
                const html = (await leerLimitado(res, 3 * 1024 * 1024)) || Buffer.alloc(0);
                const cands = extraerCandidatos(html.toString('utf8'), res.url || web);
                const img = await mejorImagen(cands, res.url || web);
                if (img) {
                    r.imagen = img.url;
                    r.estado = 'OK';
                    r.tam = img.dim ? `${img.dim.w}x${img.dim.h}` : 'tamaño ?';
                    if (aplicar) {
                        const nombreArchivo = `bodega-${b.id}-${Date.now()}${img.ext}`;
                        fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), img.buf);
                        await pool.query('UPDATE bodegas SET imagen = ? WHERE id = ?', [`bodegas/${nombreArchivo}`, b.id]);
                    }
                }
            } catch (e) {
                r.estado = `no se pudo abrir la web (${e.name === 'AbortError' ? 'timeout' : (e.cause && e.cause.code) || e.message})`;
            }
            resultados.push(r);
            console.log(`${r.estado === 'OK' ? 'OK  ' : 'NO  '} #${b.id} ${b.nombre}  ${r.estado === 'OK' ? `[${r.tam}] <- ${r.imagen}` : `(${r.estado})`}`);
        };

        const cola = conWeb.slice();
        await Promise.all(Array.from({ length: 4 }, async () => { while (cola.length) await procesar(cola.shift()); }));

        const ok = resultados.filter((r) => r.estado === 'OK').length;
        console.log(`\nImagen encontrada: ${ok} de ${conWeb.length}${aplicar ? ' (guardadas y asignadas)' : ' (simulacro: nada guardado)'}`);
        if (sinWeb.length) {
            console.log(`\n--- SIN SITIO WEB CARGADO (${sinWeb.length}): hay que cargar la foto a mano ---`);
            sinWeb.forEach((r) => console.log(`#${r.id} ${r.nombre} (${r.estado})`));
        }
        const falto = resultados.filter((r) => r.estado !== 'OK');
        if (falto.length) {
            console.log(`\n--- CON WEB PERO SIN IMAGEN UTILIZABLE (${falto.length}) ---`);
            falto.forEach((r) => console.log(`#${r.id} ${r.nombre}  ${r.web}  (${r.estado})`));
        }
        if (!aplicar) console.log('\nSIMULACRO: no se guardó nada. Para aplicar: node scripts/descargar_fotos_web.js --aplicar');
        process.exit(0);
    })().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
