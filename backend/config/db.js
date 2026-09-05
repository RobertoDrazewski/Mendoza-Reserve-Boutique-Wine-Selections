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
    queueLimit: 0,
    // Mandamos paquetes de "keep-alive" por el socket TCP para que Aiven (y cualquier
    // proxy/firewall en el medio) no dé de baja una conexión del pool por inactividad.
    // Esto es más un paliativo que una solución total: en desarrollo local, si el
    // backend queda un rato largo sin recibir pedidos, Aiven puede cortar igual la
    // conexión del lado de ellos — por eso además envolvemos query() más abajo para
    // reintentar UNA vez si el pool nos da una conexión ya muerta (ECONNRESET /
    // PROTOCOL_CONNECTION_LOST), en vez de que ese error le llegue crudo al usuario.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000
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

// Errores transitorios de una conexión del pool que ya estaba muerta del lado del
// servidor (Aiven la cortó por inactividad) — reintentar la consulta una vez con una
// conexión nueva del pool suele alcanzar, en vez de devolver un error 500 al usuario
// por algo que se resuelve solo en el segundo intento.
const CODIGOS_RECONECTABLES = new Set([
    'ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'ETIMEDOUT',
    'ECONNREFUSED',
]);

const poolConReintento = {
    async query(...args) {
        try {
            return await pool.query(...args);
        } catch (err) {
            if (CODIGOS_RECONECTABLES.has(err.code)) {
                console.warn(`⚠️ Conexión a la base perdida (${err.code}), reintentando la consulta una vez...`);
                return await pool.query(...args);
            }
            throw err;
        }
    },
    getConnection: (...args) => pool.getConnection(...args),
};

module.exports = poolConReintento;