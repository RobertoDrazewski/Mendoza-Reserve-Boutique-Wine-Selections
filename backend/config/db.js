const mysql = require('mysql2/promise');
require('dotenv').config();

// DB_SSL: 'true' en producción (Aiven exige SSL). En desarrollo local (MariaDB/MySQL
// sin SSL configurado) se pone DB_SSL=false en el .env local — ver backend/.env.example.
const useSSL = process.env.DB_SSL !== 'false';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 24554,
    connectTimeout: 60000, // 60 segundos de paciencia
    ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
    // Añadimos esto para asegurar que la conexión no se caiga
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

(async () => {
    try {
        console.log('--- 🛡️ INTENTANDO CONEXIÓN CON IP DIRECTA ---');
        console.log(`📍 IP: ${dbConfig.host} | Puerto: ${dbConfig.port}`); 
        const connection = await pool.getConnection();
        console.log('✅ ¡SISTEMA ONLINE! Conectado a Aiven MySQL.');
        connection.release();
    } catch (err) {
        console.error('❌ ERROR CRÍTICO:', err.code);
        console.error('❌ MENSAJE:', err.message);
    }
})();

module.exports = pool;