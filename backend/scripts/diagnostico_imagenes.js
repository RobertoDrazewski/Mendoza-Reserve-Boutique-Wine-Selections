/**
 * diagnostico_imagenes.js
 *
 * SOLO LECTURA: no modifica la base ni ningún archivo (salvo escribir el reporte
 * diagnostico_imagenes.csv en la carpeta desde donde lo corras).
 *
 * Revisa el campo "imagen" de TODAS las bodegas de la base real (usa backend/.env)
 * y te dice, bodega por bodega, por qué una foto no se ve:
 *
 *  - vacia          -> la bodega no tiene imagen asignada (muestra el logo genérico).
 *  - local          -> nombre de archivo (frontend/public/images): chequea que el archivo exista
 *                      (y avisa si existe pero con otras mayúsculas/minúsculas, que en Linux rompe).
 *  - subida         -> "bodegas/<archivo>", subida desde el panel admin: chequea que el archivo
 *                      exista en IMAGES_DIR (si el servidor perdió esa carpeta, acá se ve).
 *  - externa        -> URL de otro sitio: la pide como lo haría un navegador y reporta si responde.
 *
 * También lista las fotos que están en frontend/public/images pero que ninguna bodega usa.
 *
 * Uso (desde la carpeta backend/):
 *   node scripts/diagnostico_imagenes.js
 *
 * Requiere Node 18 o superior (usa fetch nativo).
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

// En tu compu las fotos propias están en frontend/public/images; en el servidor (build de React)
// quedan en frontend/build/images. Se revisan las dos carpetas.
const PUBLIC_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');
const BUILD_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'build', 'images');
const IMAGES_DIR = process.env.IMAGES_DIR
    ? path.resolve(process.env.IMAGES_DIR)
    : path.join(__dirname, '..', 'images');
const UPLOADS_DIR = path.join(IMAGES_DIR, 'bodegas');

// Archivos del sitio que no son fotos de bodegas (no los listamos como "sin asignar").
const NO_ES_FOTO_DE_BODEGA = /favicon|android-chrome|apple-touch|icon-|logo|og-image|fondo|historia|home|IMG_|\.ico$/i;

const listar = (dir) => {
    try { return fs.readdirSync(dir); } catch (e) { return null; }
};

async function probarUrl(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal,
            headers: {
                // Igual que un navegador visitando tu sitio (algunos servidores bloquean el hotlinking).
                'Referer': 'https://mendoza-reserve.co.uk/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8',
                'Range': 'bytes=0-1023'
            }
        });
        const tipo = (res.headers.get('content-type') || '').toLowerCase();
        const ok = (res.status >= 200 && res.status < 400) && (tipo.startsWith('image/') || tipo.includes('octet-stream'));
        return { ok, detalle: `HTTP ${res.status} ${tipo || 'sin content-type'}` };
    } catch (e) {
        return { ok: false, detalle: e.name === 'AbortError' ? 'timeout (12 s)' : `error de red: ${e.cause && e.cause.code ? e.cause.code : e.message}` };
    } finally {
        clearTimeout(timer);
    }
}

async function enLotes(items, tamano, fn) {
    for (let i = 0; i < items.length; i += tamano) {
        await Promise.all(items.slice(i, i + tamano).map(fn));
    }
}

(async () => {
    const [rows] = await pool.query('SELECT id, nombre, slug, estado, imagen FROM bodegas ORDER BY id');
    const listaPublic = listar(PUBLIC_IMAGES);
    const listaBuild = listar(BUILD_IMAGES);
    const archivosLocales = (listaPublic || listaBuild) ? Array.from(new Set([...(listaPublic || []), ...(listaBuild || [])])) : null;
    const archivosSubidos = listar(UPLOADS_DIR);

    console.log(`Bodegas en la base: ${rows.length}`);
    console.log(`Fotos propias (public/images: ${listaPublic ? listaPublic.length : 'no existe'} | build/images: ${listaBuild ? listaBuild.length : 'no existe'})`);
    console.log(`Carpeta de fotos subidas  (${UPLOADS_DIR}): ${archivosSubidos ? archivosSubidos.length + ' archivos' : 'NO EXISTE o vacía'}\n`);

    const resultado = rows.map((r) => {
        const img = (r.imagen || '').trim();
        let tipo, ok = null, detalle = '';
        if (!img) {
            tipo = 'vacia'; ok = false; detalle = 'sin imagen asignada';
        } else if (/^https?:\/\//i.test(img)) {
            tipo = 'externa';
        } else if (img.startsWith('bodegas/')) {
            tipo = 'subida';
            const nombre = img.slice('bodegas/'.length);
            ok = !!(archivosSubidos && archivosSubidos.includes(nombre));
            detalle = ok ? 'archivo presente' : 'EL ARCHIVO NO ESTÁ en el servidor (carpeta efímera o borrada)';
        } else {
            tipo = 'local';
            if (archivosLocales && archivosLocales.includes(img)) { ok = true; detalle = 'archivo presente'; }
            else {
                const parecido = archivosLocales && archivosLocales.find((f) => f.toLowerCase() === img.toLowerCase());
                ok = false;
                detalle = parecido ? `existe como "${parecido}" (mayúsculas distintas: falla en Linux)` : 'EL ARCHIVO NO EXISTE en las fotos propias (public/images o build/images)';
            }
        }
        return { ...r, imagen: img, tipo, ok, detalle };
    });

    const externas = resultado.filter((r) => r.tipo === 'externa');
    console.log(`Probando ${externas.length} URLs externas (puede tardar un minuto)...`);
    await enLotes(externas, 8, async (r) => {
        const t = await probarUrl(r.imagen);
        r.ok = t.ok; r.detalle = t.detalle;
    });

    // --- Resumen ---
    const por = (tipo) => resultado.filter((r) => r.tipo === tipo);
    const linea = (nombre, lista) => `${nombre.padEnd(9)} total ${String(lista.length).padStart(3)} | se ven ${String(lista.filter((r) => r.ok).length).padStart(3)} | rotas ${String(lista.filter((r) => r.ok === false).length).padStart(3)}`;
    console.log('\n===== RESUMEN =====');
    ['local', 'subida', 'externa'].forEach((t) => console.log(linea(t, por(t))));
    console.log(`vacia     total ${por('vacia').length} (sin imagen asignada)`);
    const porEstado = {};
    resultado.forEach((r) => { porEstado[r.estado] = (porEstado[r.estado] || 0) + 1; });
    console.log('Estados:', JSON.stringify(porEstado));

    // --- Detalle de rotas ---
    const rotas = resultado.filter((r) => r.tipo !== 'vacia' && r.ok === false);
    console.log(`\n===== FOTOS ASIGNADAS QUE NO SE VEN (${rotas.length}) =====`);
    rotas.forEach((r) => console.log(`[${r.tipo}] #${r.id} ${r.nombre} (${r.estado}) -> ${r.imagen}\n      ${r.detalle}`));

    // --- Fotos en la carpeta que nadie usa ---
    if (archivosLocales) {
        const usadas = new Set(resultado.filter((r) => r.tipo === 'local').map((r) => r.imagen));
        const sinAsignar = archivosLocales.filter((f) => !usadas.has(f) && !NO_ES_FOTO_DE_BODEGA.test(f) && /\.(jpe?g|png|webp)$/i.test(f));
        console.log(`\n===== FOTOS EN frontend/public/images QUE NINGUNA BODEGA USA (${sinAsignar.length}) =====`);
        sinAsignar.forEach((f) => console.log(`  ${f}`));
    }

    // --- Reporte CSV ---
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = ['id,nombre,slug,estado,tipo,se_ve,imagen,detalle']
        .concat(resultado.map((r) => [r.id, r.nombre, r.slug, r.estado, r.tipo, r.ok === null ? '' : r.ok ? 'si' : 'no', r.imagen, r.detalle].map(esc).join(',')))
        .join('\n');
    fs.writeFileSync('diagnostico_imagenes.csv', '﻿' + csv);
    console.log('\nReporte completo guardado en diagnostico_imagenes.csv (en la carpeta donde corriste el comando).');

    process.exit(0);
})().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
