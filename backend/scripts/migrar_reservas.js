// Migración: crea la tabla "reservas" (el pago del 12% que el comprador le hace
// directo a Mendoza Reserve vía Revolut, antes de que el pedido se le mande a la
// bodega) en una base que ya existe, sin tocar nada de lo que ya está cargado.
// Segura de correr más de una vez.
//
// Uso (desde la carpeta backend/):
//   node scripts/migrar_reservas.js
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

    try {
        const [tablas] = await connection.query(
            `SELECT COUNT(*) AS existe FROM information_schema.tables
             WHERE table_schema = ? AND table_name = 'reservas'`,
            [process.env.DB_NAME]
        );

        if (tablas[0].existe > 0) {
            console.log('▶ La tabla reservas ya existe — no hace falta hacer nada.\n');
        } else {
            console.log('▶ Creando tabla reservas...');
            await connection.query(`
                CREATE TABLE reservas (
                    id                  INT AUTO_INCREMENT PRIMARY KEY,
                    cart_group_id       CHAR(36) NOT NULL,
                    monto               DECIMAL(10,2) NOT NULL,
                    moneda              CHAR(3) NOT NULL DEFAULT 'GBP',
                    estado              ENUM('pendiente','pagada','fallida','reembolsada','parcialmente_reembolsada')
                                        NOT NULL DEFAULT 'pendiente',
                    reembolsado_monto   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                    revolut_order_id    VARCHAR(64) UNIQUE,
                    checkout_url        TEXT,
                    paid_at             DATETIME NULL,
                    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
            await connection.query('CREATE INDEX idx_reservas_cart_group ON reservas (cart_group_id)');
            await connection.query('CREATE INDEX idx_reservas_estado ON reservas (estado)');
            console.log('  ✅ Listo.\n');
        }
    } catch (err) {
        console.error('  ❌ Error:', err.message);
        await connection.end();
        process.exit(1);
    }

    await connection.end();
    console.log('🏁 Migración aplicada. Ya se puede cobrar la reserva con Revolut.');
}

main().catch((err) => {
    console.error('❌ Error inesperado:', err);
    process.exit(1);
});
