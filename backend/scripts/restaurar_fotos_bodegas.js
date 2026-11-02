/**
 * restaurar_fotos_bodegas.js
 *
 * Carga en lote fotos de bodegas desde una carpeta, nombradas por el ID de la bodega
 * (ej.: 3.jpg, 5.jpeg, 38.webp; también vale "3-ruca-malen.jpg": se toma el número inicial).
 * Copia cada foto a IMAGES_DIR/bodegas y actualiza el campo "imagen" de esa bodega.
 *
 * Por defecto es SIMULACRO: solo muestra qué haría. Para aplicar de verdad: --aplicar
 *
 * Uso (desde backend/, dentro del contenedor):
 *   node scripts/restaurar_fotos_bodegas.js /ruta/a/la/carpeta
 *   node scripts/restaurar_fotos_bodegas.js /ruta/a/la/carpeta --aplicar
 */
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const carpeta = process.argv[2];
const aplicar = process.argv.includes('--aplicar');
if (!carpeta) { console.error('Falta la carpeta de fotos.'); process.exit(1); }

const IMAGES_DIR = process.env.IMAGES_DIR ? path.resolve(process.env.IMAGES_DIR) : path.join(__dirname, '..', 'images');
const DESTINO = path.join(IMAGES_DIR, 'bodegas');
const EXT = /\.(jpe?g|png|webp)$/i;

(async () => {
    const archivos = fs.readdirSync(carpeta).filter((f) => EXT.test(f));
    console.log(`${aplicar ? 'APLICANDO' : 'SIMULACRO'} - ${archivos.length} fotos en ${carpeta}\n`);
    if (aplicar) fs.mkdirSync(DESTINO, { recursive: true });
    let ok = 0, saltadas = 0;
    for (const f of archivos) {
        const m = f.match(/^(\d+)/);
        if (!m) { console.log(`SALTADA (sin ID al inicio): ${f}`); saltadas++; continue; }
        const id = parseInt(m[1], 10);
        const [rows] = await pool.query('SELECT id, nombre FROM bodegas WHERE id = ?', [id]);
        if (!rows.length) { console.log(`SALTADA (no existe la bodega #${id}): ${f}`); saltadas++; continue; }
        const ext = path.extname(f).toLowerCase().replace('.jpeg', '.jpeg');
        const nuevo = `bodega-${id}-${Date.now()}${ext}`;
        console.log(`#${id} ${rows[0].nombre}  <-  ${f}  =>  bodegas/${nuevo}`);
        if (aplicar) {
            fs.copyFileSync(path.join(carpeta, f), path.join(DESTINO, nuevo));
            await pool.query('UPDATE bodegas SET imagen = ? WHERE id = ?', [`bodegas/${nuevo}`, id]);
        }
        ok++;
    }
    console.log(`\n${aplicar ? 'Cargadas' : 'Se cargarían'}: ${ok} | saltadas: ${saltadas}`);
    process.exit(0);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
