// Migración: agrega todo lo necesario para los portales de bodega y closer sobre una
// base que ya existe (por ejemplo la de Aiven en producción), sin tocar los datos ya
// cargados. Segura de correr más de una vez (idempotente).
//
// Qué hace:
//   1. usuarios.rol -> agrega 'bodega' y 'closer' al ENUM (si no estaban ya)
//   2. usuarios.bodega_id -> nueva columna + FK a bodegas(id) + índice
//   3. leads_uk.closer_id -> nueva columna + FK a usuarios(id) + índice
//
// Uso (desde la carpeta backend/):
//   node scripts/migrar_roles_portales.js
//
// Lee la conexión desde backend/.env (las mismas variables que ya usa el servidor).

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function columnaExiste(connection, tabla, columna) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS existe FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
        [process.env.DB_NAME, tabla, columna]
    );
    return rows[0].existe > 0;
}

async function indiceExiste(connection, tabla, indice) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS existe FROM information_schema.statistics
         WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
        [process.env.DB_NAME, tabla, indice]
    );
    return rows[0].existe > 0;
}

async function fkExiste(connection, tabla, nombreFk) {
    const [rows] = await connection.query(
        `SELECT COUNT(*) AS existe FROM information_schema.table_constraints
         WHERE table_schema = ? AND table_name = ? AND constraint_name = ? AND constraint_type = 'FOREIGN KEY'`,
        [process.env.DB_NAME, tabla, nombreFk]
    );
    return rows[0].existe > 0;
}

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

    try {
        // 1. ENUM de usuarios.rol
        const [colRol] = await connection.query(
            `SELECT COLUMN_TYPE FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'usuarios' AND column_name = 'rol'`,
            [process.env.DB_NAME]
        );
        const tipoActual = colRol[0] ? colRol[0].COLUMN_TYPE : '';
        if (tipoActual.includes("'bodega'") && tipoActual.includes("'closer'")) {
            console.log('▶ usuarios.rol ya incluye bodega/closer — no hace falta tocarlo.\n');
        } else {
            console.log('▶ Ampliando el ENUM de usuarios.rol para incluir bodega y closer...');
            await connection.query(
                `ALTER TABLE usuarios MODIFY rol ENUM('cliente','admin','bodega','closer') NOT NULL DEFAULT 'cliente'`
            );
            console.log('  ✅ Listo.\n');
        }

        // 2. usuarios.bodega_id
        if (await columnaExiste(connection, 'usuarios', 'bodega_id')) {
            console.log('▶ La columna usuarios.bodega_id ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Agregando columna usuarios.bodega_id...');
            await connection.query('ALTER TABLE usuarios ADD COLUMN bodega_id INT NULL AFTER rol');
            console.log('  ✅ Listo.\n');
        }

        if (await fkExiste(connection, 'usuarios', 'fk_usuarios_bodega')) {
            console.log('▶ El FK fk_usuarios_bodega ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Agregando FK usuarios.bodega_id -> bodegas.id...');
            await connection.query(
                `ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_bodega
                 FOREIGN KEY (bodega_id) REFERENCES bodegas(id) ON DELETE SET NULL`
            );
            console.log('  ✅ Listo.\n');
        }

        if (await indiceExiste(connection, 'usuarios', 'idx_usuarios_bodega')) {
            console.log('▶ El índice idx_usuarios_bodega ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Creando índice idx_usuarios_bodega...');
            await connection.query('CREATE INDEX idx_usuarios_bodega ON usuarios (bodega_id)');
            console.log('  ✅ Listo.\n');
        }

        if (await indiceExiste(connection, 'usuarios', 'idx_usuarios_rol')) {
            console.log('▶ El índice idx_usuarios_rol ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Creando índice idx_usuarios_rol...');
            await connection.query('CREATE INDEX idx_usuarios_rol ON usuarios (rol)');
            console.log('  ✅ Listo.\n');
        }

        // 3. leads_uk.closer_id
        if (await columnaExiste(connection, 'leads_uk', 'closer_id')) {
            console.log('▶ La columna leads_uk.closer_id ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Agregando columna leads_uk.closer_id...');
            await connection.query('ALTER TABLE leads_uk ADD COLUMN closer_id INT NULL AFTER notas');
            console.log('  ✅ Listo.\n');
        }

        if (await fkExiste(connection, 'leads_uk', 'fk_leads_closer')) {
            console.log('▶ El FK fk_leads_closer ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Agregando FK leads_uk.closer_id -> usuarios.id...');
            await connection.query(
                `ALTER TABLE leads_uk ADD CONSTRAINT fk_leads_closer
                 FOREIGN KEY (closer_id) REFERENCES usuarios(id) ON DELETE SET NULL`
            );
            console.log('  ✅ Listo.\n');
        }

        if (await indiceExiste(connection, 'leads_uk', 'idx_leads_closer')) {
            console.log('▶ El índice idx_leads_closer ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Creando índice idx_leads_closer...');
            await connection.query('CREATE INDEX idx_leads_closer ON leads_uk (closer_id)');
            console.log('  ✅ Listo.\n');
        }
    } catch (err) {
        console.error('  ❌ Error:', err.message);
        await connection.end();
        process.exit(1);
    }

    await connection.end();
    console.log('🏁 Migración aplicada. Ya se pueden dar de alta bodegas y closers.');
}

main().catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
});
