// Promociona un usuario existente a rol 'admin', directo por Node (sin SQL a mano).
//
// Uso (desde la carpeta backend/):
//   node scripts/makeAdmin.js tu-email@ejemplo.com
//
// Lee la conexión desde backend/.env (mismas variables que usa el servidor).
// El usuario tiene que haberse registrado antes normalmente en el sitio (/registro) —
// este script solo le cambia el rol de 'cliente' a 'admin'.

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const email = process.argv[2];

if (!email) {
    console.error('❌ Falta el email. Uso: node scripts/makeAdmin.js tu-email@ejemplo.com');
    process.exit(1);
}

async function main() {
    const useSSL = process.env.DB_SSL !== 'false';

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT, 10),
        connectTimeout: 60000,
        ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {})
    });

    const [existentes] = await connection.query('SELECT id, nombre, apellido, rol FROM usuarios WHERE email = ?', [email]);

    if (existentes.length === 0) {
        console.error(`❌ No existe ningún usuario registrado con el email "${email}".`);
        console.error('   Registrate primero en el sitio (/registro) con ese email y volvé a correr este script.');
        await connection.end();
        process.exit(1);
    }

    const usuario = existentes[0];

    if (usuario.rol === 'admin') {
        console.log(`ℹ️  ${email} ya es admin. No hace falta hacer nada.`);
        await connection.end();
        return;
    }

    await connection.query("UPDATE usuarios SET rol = 'admin' WHERE email = ?", [email]);
    console.log(`✅ ${usuario.nombre} ${usuario.apellido || ''} (${email}) ahora es admin.`);
    console.log('   Cerrá sesión y volvé a entrar al sitio para ver el link ADMIN en el menú.');

    await connection.end();
}

main().catch((err) => {
    console.error('❌ Error inesperado:', err.message);
    process.exit(1);
});
