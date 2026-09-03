// Script para cargar schema.sql + seed_bodegas.sql + update_bodega_images.sql
// directo a la base de Aiven usando Node, sin necesidad de instalar el cliente `mysql`
// ni una app como TablePlus.
//
// Uso (desde la carpeta backend/):
//   node scripts/loadSchema.js
//
// Lee la conexión desde backend/.env (las mismas variables DB_HOST, DB_USER,
// DB_PASSWORD, DB_NAME, DB_PORT, DB_SSL que ya usa el servidor).

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const archivos = ['schema.sql', 'seed_bodegas.sql', 'update_bodega_images.sql'];

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
        multipleStatements: true, // necesario para correr un .sql entero de una
        ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
    });

    console.log('✅ Conectado.\n');

    for (const archivo of archivos) {
        const ruta = path.join(__dirname, '..', 'sql', archivo);
        const sql = fs.readFileSync(ruta, 'utf8');
        console.log(`▶ Ejecutando ${archivo}...`);
        try {
            await connection.query(sql);
            console.log(`  ✅ ${archivo} cargado OK.\n`);
        } catch (err) {
            console.error(`  ❌ Error en ${archivo}:`, err.message);
            await connection.end();
            process.exit(1);
        }
    }

    const [rows] = await connection.query('SELECT COUNT(*) AS total FROM bodegas;');
    console.log(`📦 Total de bodegas cargadas: ${rows[0].total} (esperado: 144)`);

    await connection.end();
    console.log('\n🏁 Listo. Ya podés levantar el backend normalmente (npm run dev).');
}

main().catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
});