/**
 * asignar_fotos_locales.js
 *
 * Asigna automáticamente a cada bodega SIN foto válida una de las fotos que ya están en
 * frontend/public/images (o frontend/build/images en el servidor) y que ninguna bodega usa,
 * comparando el nombre del archivo con el nombre de la bodega.
 *
 * - NO toca bodegas que ya tienen una foto que se ve (local existente, subida existente o URL externa).
 * - Por defecto es SIMULACRO: muestra la tabla de coincidencias y no cambia nada.
 * - Con --aplicar guarda solo las coincidencias seguras (puntaje alto y sin empate).
 *
 * Uso (desde la carpeta backend/, dentro del contenedor):
 *   node scripts/asignar_fotos_locales.js
 *   node scripts/asignar_fotos_locales.js --aplicar
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');
const BUILD_IMAGES = path.join(__dirname, '..', '..', 'frontend', 'build', 'images');
const IMAGES_DIR = process.env.IMAGES_DIR ? path.resolve(process.env.IMAGES_DIR) : path.join(__dirname, '..', 'images');
const UPLOADS_DIR = path.join(IMAGES_DIR, 'bodegas');

// Archivos del sitio que no son fotos de bodegas, y fotos de vinos (botellas).
const NO_ES_FOTO_DE_BODEGA = /favicon|android-chrome|apple-touch|icon-|logo|og-image|fondo|historia|home|IMG_|\.ico$/i;
const ES_FOTO_DE_VINO = /^(blend|bonarda|cabernet|chardonnay|espumante|malbec|pinot|ros[eé]|syrah|torront)/i;
const EXT = /\.(jpe?g|png|webp)$/i;

const PALABRAS_VACIAS = new Set(['bodega', 'bodegas', 'wines', 'wine', 'vinos', 'vino', 'vinedos', 'vinedo', 'winery', 'finca', 'fincas', 'estate', 'y', 'de', 'del', 'la', 'el', 'los', 'las', 'the', 'and']);

const NUMEROS = { uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9' };

const normalizar = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_\-.]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ').map((w) => NUMEROS[w] || w).join(' ');

const tokens = (s) => normalizar(s).split(' ').filter((t) => t && !PALABRAS_VACIAS.has(t));
const compacto = (s) => tokens(s).join('');
const completo = (s) => normalizar(s).replace(/ /g, '');

// Puntaje 0..100 entre el nombre de una bodega y el nombre de un archivo.
function puntaje(nombreBodega, archivo) {
    const limpio = archivo.replace(/_\d+(\.[a-z0-9]+)$/i, '$1');
    const a = compacto(nombreBodega);
    const b = compacto(limpio);
    if (!a || !b) return 0;
    if (a === b || completo(nombreBodega) === completo(limpio)) return 100;
    const A = completo(nombreBodega);
    const B = completo(limpio);
    if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a) || A.includes(B) || B.includes(A))) return 88;
    const ta = tokens(nombreBodega);
    const tb = tokens(archivo);
    const comunes = ta.filter((t) => tb.includes(t) && t.length >= 3);
    if (!comunes.length) return 0;
    return Math.round(70 * (comunes.length / Math.max(ta.length, tb.length)) + 10);
}

module.exports = { normalizar, tokens, puntaje };

if (require.main === module) {
    const pool = require('../config/db');
    const aplicar = process.argv.includes('--aplicar');
    const UMBRAL = 80;       // puntaje mínimo para asignar solo
    const DISTANCIA = 10;    // el mejor candidato debe superar al segundo por esta diferencia

    const listar = (dir) => { try { return fs.readdirSync(dir); } catch (e) { return null; } };

    (async () => {
        const [rows] = await pool.query('SELECT id, nombre, estado, imagen FROM bodegas ORDER BY id');
        const lp = listar(PUBLIC_IMAGES);
        const lb = listar(BUILD_IMAGES);
        const locales = Array.from(new Set([...(lp || []), ...(lb || [])]));
        const subidas = listar(UPLOADS_DIR) || [];
        if (!locales.length) { console.error('No encontré fotos en frontend/public/images ni en frontend/build/images.'); process.exit(1); }

        const usadas = new Set(rows.map((r) => (r.imagen || '').trim()).filter(Boolean));
        const libres = locales.filter((f) => EXT.test(f) && !NO_ES_FOTO_DE_BODEGA.test(f) && !ES_FOTO_DE_VINO.test(f) && !usadas.has(f));

        // Bodegas "sin foto válida": vacía, local que no existe o subida que no está.
        const sinFoto = rows.filter((r) => {
            const img = (r.imagen || '').trim();
            if (!img) return true;
            if (/^https?:\/\//i.test(img)) return false;
            if (img.startsWith('bodegas/')) return !subidas.includes(img.slice('bodegas/'.length));
            return !locales.includes(img);
        });

        console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO'} | bodegas sin foto válida: ${sinFoto.length} | fotos libres: ${libres.length}\n`);

        const asignadas = {};
        const usadasAhora = new Set();
        const filas = [];
        sinFoto.forEach((b) => {
            const cands = libres.map((f) => ({ f, p: puntaje(b.nombre, f) })).filter((c) => c.p > 0).sort((x, y) => y.p - x.p);
            const mejor = cands[0];
            const segundo = cands[1];
            const seguro = mejor && mejor.p >= UMBRAL && (!segundo || mejor.p - segundo.p >= DISTANCIA);
            filas.push({ b, mejor, segundo, seguro });
        });

        // Si dos bodegas quieren la misma foto, gana la de mayor puntaje; la otra queda para revisar.
        filas.filter((x) => x.seguro).sort((x, y) => y.mejor.p - x.mejor.p).forEach((x) => {
            if (usadasAhora.has(x.mejor.f)) { x.seguro = false; x.motivo = 'otra bodega la reclama con mayor puntaje'; return; }
            usadasAhora.add(x.mejor.f);
            asignadas[x.b.id] = x.mejor.f;
        });

        console.log('--- ASIGNACIONES SEGURAS ---');
        filas.filter((x) => asignadas[x.b.id]).forEach((x) => console.log(`#${x.b.id} ${x.b.nombre}  <-  ${x.mejor.f}  (${x.mejor.p})`));
        console.log('\n--- A REVISAR A MANO (coincidencia dudosa) ---');
        filas.filter((x) => !asignadas[x.b.id] && x.mejor).forEach((x) => console.log(`#${x.b.id} ${x.b.nombre}  ?  ${x.mejor.f} (${x.mejor.p})${x.segundo ? ' | ' + x.segundo.f + ' (' + x.segundo.p + ')' : ''}${x.motivo ? ' | ' + x.motivo : ''}`));
        const sinCand = filas.filter((x) => !x.mejor);
        console.log(`\n--- SIN FOTO DISPONIBLE (subir desde el panel admin): ${sinCand.length} ---`);
        sinCand.forEach((x) => console.log(`#${x.b.id} ${x.b.nombre} (${x.b.estado})`));
        const sobran = libres.filter((f) => !usadasAhora.has(f));
        console.log(`\n--- FOTOS QUE SOBRAN SIN BODEGA (${sobran.length}) ---`);
        sobran.forEach((f) => console.log(`  ${f}`));

        if (aplicar) {
            let n = 0;
            for (const id of Object.keys(asignadas)) {
                await pool.query('UPDATE bodegas SET imagen = ? WHERE id = ?', [asignadas[id], id]);
                n++;
            }
            console.log(`\nActualizadas: ${n}`);
        } else {
            console.log('\nSIMULACRO: no se cambió nada. Para aplicar: node scripts/asignar_fotos_locales.js --aplicar');
        }
        process.exit(0);
    })().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
