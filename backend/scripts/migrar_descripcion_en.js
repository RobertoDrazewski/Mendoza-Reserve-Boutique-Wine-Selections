// Migración: agrega la columna "descripcion_en" (bio en inglés de cada bodega)
// a una base que ya existe (por ejemplo la de Aiven en producción), sin tocar
// los datos ya cargados. Segura de correr más de una vez.
//
// Uso (desde la carpeta backend/):
//   node scripts/migrar_descripcion_en.js
//
// Lee la conexión desde backend/.env (las mismas variables DB_HOST, DB_USER,
// DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL que ya usa el servidor).

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function main() {
    const useSSL = process.env.DB_SSL !== 'false';

    console.log(`Conectando a ${process.env.DB_HOST}:${process.env.DB_PORT}, base "${process.env.DB_NAME}"...`);

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, 10),
        connectTimeout: 60000,
        ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
    });

    console.log('✅ Conectado.\n');

    // No usamos "ADD COLUMN IF NOT EXISTS" porque esa sintaxis no la soportan todas
    // las versiones de MySQL (la de Aiven tiró error de sintaxis con eso) —
    // chequeamos nosotros mismos contra information_schema antes de alterar la tabla,
    // así el script es idempotente en cualquier versión.
    try {
        const [cols] = await connection.query(
            `SELECT COUNT(*) AS existe FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'bodegas' AND column_name = 'descripcion_en'`,
            [process.env.DB_NAME]
        );

        if (cols[0].existe > 0) {
            console.log('▶ La columna descripcion_en ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Agregando columna descripcion_en...');
            await connection.query('ALTER TABLE bodegas ADD COLUMN descripcion_en TEXT AFTER descripcion');
            console.log('  ✅ Listo.\n');
        }
    } catch (err) {
        console.error('  ❌ Error:', err.message);
        await connection.end();
        process.exit(1);
    }

    await connection.end();
    console.log('🏁 Migración aplicada. Ya podés generar bios en los dos idiomas desde el admin.');
}

main().catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
});
