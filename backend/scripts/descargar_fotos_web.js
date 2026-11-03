/**
 * descargar_fotos_web.js
 *
 * Para las bodegas SIN foto válida que tienen "sitio_web" cargado, entra a su página, busca la imagen
 * principal (og:image / twitter:image / imagen del encabezado), la DESCARGA y la guarda en la carpeta de
 * fotos del servidor (IMAGES_DIR/bodegas), y actualiza el campo "imagen". Así la foto queda en tu propio
 * servidor y no se rompe si la bodega cambia su web.
 *
 * - Ignora las bodegas "rechazada" y las que ya tienen foto (que se ve).
 * - Por defecto es SIMULACRO: muestra qué imagen encontró para cada bodega, sin guardar nada.
 * - Con --aplicar guarda los archivos y actualiza la base.
 *
 * IMPORTANTE: IMAGES_DIR tiene que apuntar a un volumen PERSISTENTE en Coolify; si no, las fotos se
 * pierden en el próximo deploy (así se perdieron las anteriores).
 *
 * Uso (desde backend/, dentro del contenedor, que tiene salida a internet):
 *   node scripts/descargar_fotos_web.js
 *   node scripts/descargar_fotos_web.js --aplicar
 *   node scripts/descargar_fotos_web.js --aplicar --id=44      (una sola bodega)
 */
const fs = require('fs');
const path = require('path');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const MIN_BYTES = 8 * 1024;          // menos que esto suele ser un ícono o un pixel
const MAX_BYTES = 6 * 1024 * 1024;
const EXT_POR_TIPO = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' };

const decodificar = (s) => String(s).replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Devuelve las URLs de imagen candidatas de un HTML, de mejor a peor.
function extraerCandidatos(html, base) {
    const out = [];
    const agregar = (u) => {
        if (!u) return;
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
    (html.match(/<link\b[^>]*>/gi) || [])
        .filter((l) => /rel\s*=\s*["']image_src["']/i.test(l))
        .forEach((l) => agregar((l.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]));
    // Últimos recursos: imágenes grandes del encabezado (hero / banner / slider).
    (html.match(/<img\b[^>]*>/gi) || [])
        .filter((t) => /(hero|banner|slider|header|portada|cover|bodega|vinedo|winery|estate)/i.test(t))
        .slice(0, 4)
        .forEach((t) => agregar((t.match(/(?:data-src|src)\s*=\s*["']([^"']+)["']/i) || [])[1]));
    (html.match(/<link\b[^>]*>/gi) || [])
        .filter((l) => /rel\s*=\s*["']apple-touch-icon/i.test(l))
        .forEach((l) => agregar((l.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]));
    return out;
}

module.exports = { extraerCandidatos, descargarImagen, pedir };

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
    return { buf, ext, tipo };
}

if (require.main === module) {
    const pool = require('../config/db');
    const aplicar = process.argv.includes('--aplicar');
    const soloId = (process.argv.find((a) => a.startsWith('--id=')) || '').split('=')[1];
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
        if (soloId) lista = lista.filter((r) => String(r.id) === String(soloId));
        const conWeb = lista.filter((r) => (r.sitio_web || '').trim());
        const sinWeb = lista.filter((r) => !(r.sitio_web || '').trim());
        console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO'} | sin foto válida (sin contar rechazadas): ${lista.length} | con sitio web: ${conWeb.length} | sin sitio web: ${sinWeb.length}`);
        if (aplicar) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        console.log(`Carpeta de destino: ${UPLOADS_DIR}\n`);

        const resultados = [];
        const procesar = async (b) => {
            let web = b.sitio_web.trim();
            if (!/^https?:\/\//i.test(web)) web = `https://${web}`;
            const r = { id: b.id, nombre: b.nombre, web, estado: 'sin imagen', imagen: '' };
            try {
                const res = await pedir(web);
                if (!res.ok) { r.estado = `la web respondió HTTP ${res.status}`; resultados.push(r); return; }
                const html = (await leerLimitado(res, 2 * 1024 * 1024)) || Buffer.alloc(0);
                const cands = extraerCandidatos(html.toString('utf8'), res.url || web);
                for (const url of cands.slice(0, 6)) {
                    let img = null;
                    try { img = await descargarImagen(url, res.url || web); } catch (e) { img = null; }
                    if (!img) continue;
                    r.imagen = url;
                    r.estado = 'OK';
                    if (aplicar) {
                        const nombreArchivo = `bodega-${b.id}-${Date.now()}${img.ext}`;
                        fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), img.buf);
                        await pool.query('UPDATE bodegas SET imagen = ? WHERE id = ?', [`bodegas/${nombreArchivo}`, b.id]);
                        r.guardada = `bodegas/${nombreArchivo}`;
                    }
                    break;
                }
            } catch (e) {
                r.estado = `no se pudo abrir la web (${e.name === 'AbortError' ? 'timeout' : (e.cause && e.cause.code) || e.message})`;
            }
            resultados.push(r);
            console.log(`${r.estado === 'OK' ? 'OK  ' : 'NO  '} #${b.id} ${b.nombre}  ${r.estado === 'OK' ? '<- ' + r.imagen : '(' + r.estado + ')'}`);
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
