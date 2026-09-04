/**
 * crear_admin.js
 *
 * Da de alta (o promueve) un usuario con rol 'admin' directo en la base de
 * datos real (usa las credenciales de backend/.env). Hace falta porque el
 * registro público (/api/auth/register y /api/usuarios/registrar) SIEMPRE
 * crea usuarios con rol 'cliente' a propósito — es un endpoint público, así
 * que aceptar un rol enviado por el visitante dejaría que cualquiera se
 * auto-asigne admin. Promover a admin solo se puede hacer así, a mano.
 *
 * Uso (desde la carpeta backend/):
 *   node scripts/crear_admin.js
 *   (o "npm run crear-admin")
 *
 * Comportamiento:
 *  - Si el email NO existe todavía en "usuarios": crea la cuenta nueva con
 *    rol admin y una contraseña generada al azar.
 *  - Si el email YA existe (por ej. si Marcelo ya se había registrado como
 *    cliente): le resetea la contraseña a una nueva generada al azar y lo
 *    promueve a rol admin.
 *  - En los dos casos, la contraseña en texto plano se imprime UNA SOLA VEZ
 *    en la consola al final — no queda guardada en ningún archivo. Copiala
 *    de ahí y pasásela a Marcelo por un canal privado (WhatsApp, etc.).
 *
 * Para dar de alta a alguien más, cambiá los datos de ADMIN_A_CREAR abajo
 * y volvé a correr el script.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const ADMIN_A_CREAR = {
    nombre: 'Marcelo',
    apellido: 'Nodaro',
    email: 'marcelonodaro1975@gmail.com',
};

// Contraseña al azar, fácil de transcribir a mano (sin caracteres
// ambiguos como 0/O, 1/l/I) — 14 caracteres.
function generarPassword(longitud = 14) {
    const alfabeto = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const bytes = crypto.randomBytes(longitud);
    let pass = '';
    for (let i = 0; i < longitud; i++) {
        pass += alfabeto[bytes[i] % alfabeto.length];
    }
    return pass;
}

(async () => {
    const { nombre, apellido, email } = ADMIN_A_CREAR;
    const passwordPlano = generarPassword();
    const hash = await bcrypt.hash(passwordPlano, 10);

    try {
        const [existentes] = await pool.query('SELECT id, rol FROM usuarios WHERE email = ?', [email]);

        if (existentes.length > 0) {
            const { id, rol } = existentes[0];
            await pool.query('UPDATE usuarios SET password = ?, rol = ? WHERE id = ?', [hash, 'admin', id]);
            console.log(`Ya existía una cuenta con ese email (rol anterior: ${rol}).`);
            console.log(`Se actualizó a rol 'admin' y se generó una contraseña nueva.\n`);
        } else {
            await pool.query(
                'INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)',
                [nombre, apellido, email, hash, 'admin']
            );
            console.log('Cuenta admin creada de cero.\n');
        }

        console.log('====================================================');
        console.log(`Email:      ${email}`);
        console.log(`Contraseña: ${passwordPlano}`);
        console.log('====================================================');
        console.log('\nEsta contraseña no queda guardada en ningún lado más que acá arriba —');
        console.log('copiala ahora y pasásela a Marcelo por un canal privado.');
        console.log('Entra en /login con este email y contraseña, y va a ver "Admin" en el menú.');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
