const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST, // Aquí Render ahora usará 188.166.124.60
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 24554,
    connectTimeout: 60000, // 60 segundos de paciencia
    ssl: {
        rejectUnauthorized: false
    },
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