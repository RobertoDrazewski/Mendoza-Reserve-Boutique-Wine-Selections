// Migración: agrega la columna "descripcion_en" (bio en inglés de cada bodega)
// a una base que ya existe (por ejemplo la de Aiven en producción), sin tocar
// los datos ya cargados. Segura de correr más de una vez.
//
// Uso (desde la carpeta backend/):
//   node scripts/migrar_descripcion_en.js
//
// Lee la conexión desde backend/.env (las mismas variables DB_HOST, DB_USER,
// DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL que ya usa el servidor).

const fs = require('fs');
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

    const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'add_descripcion_en.sql'), 'utf8');

    try {
        console.log('▶ Agregando columna descripcion_en (si no existe todavía)...');
        await connection.query(sql);
        console.log('  ✅ Listo.\n');
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
