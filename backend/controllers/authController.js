const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { emailBienvenidaAcceso } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;

// Genera un slug simple a partir del nombre (mismo criterio que bodegaController.js,
// duplicado acá para no crear una dependencia circular entre controllers)
function slugify(nombre) {
    const sinAcentos = String(nombre)
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '');
    return sinAcentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function firmarToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// --- REGISTRO REPARADO (comprador UK: restaurante, importador, tienda, etc.) ---
exports.register = async (req, res) => {
    // 1. Desestructuramos los datos
    // SEGURIDAD: 'rol' NO se toma del body — este endpoint es público, así que aceptar
    // un rol enviado por el cliente permitiría que cualquiera se auto-registre como admin.
    // Todo alta pública entra como 'cliente'; el único admin se promueve a mano en la DB.
    const { nombre, apellido, email, password, empresa, telefono, pais } = req.body;

    try {
        // 2. Verificar si el email ya existe
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ msg: "El correo ya está registrado" });
        }

        // 3. Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const usuarioRol = 'cliente';

        // 4. Insertar usuario
        // IMPORTANTE: Asegúrate de que tu tabla en MySQL tenga la columna 'apellido'
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol, empresa, telefono, pais) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword, usuarioRol, empresa || null, telefono || null, pais || 'United Kingdom']
        );

        const nuevoId = result.insertId;

        // 5. GENERAR TOKEN INMEDIATAMENTE (Para que el login sea automático)
        const token = firmarToken({ id: nuevoId, rol: usuarioRol });

        // Email de bienvenida con el usuario/contraseña recién elegidos (pedido explícito
        // de Roberto) — no bloquea el registro si falla el envío.
        try {
            await emailBienvenidaAcceso({ email, password, nombre, rol: usuarioRol });
        } catch (emailError) {
            console.error('Error enviando email de bienvenida (no afecta el registro):', emailError.message);
        }

        // 6. RESPUESTA COMPLETA (Igual que en el Login)
        res.status(201).json({
            token,
            user: {
                id: nuevoId,
                nombre,
                apellido,
                rol: usuarioRol
            }
        });

    } catch (error) {
        console.error("Error en Registro:", error);
        // Si el error es "Unknown column 'apellido'", aquí lo verás en tu consola de VS Code
        res.status(500).json({ msg: "Error interno del servidor al registrar" });
    }
};

// --- ALTA PÚBLICA DE BODEGA (autogestión) ---
// La bodega se da de alta ella misma: se crea SU fila en `bodegas` (arranca en
// 'pendiente_contacto', igual que las que carga Roberto a mano) más un usuario con
// rol='bodega' linkeado a esa fila vía bodega_id. Roberto la contacta y la activa
// (estado='activa') desde el panel admin cuando confirman participación — recién ahí
// su catálogo se vuelve visible en el sitio público.
// SEGURIDAD: igual que en /register, 'rol' nunca sale del body.
exports.registerBodega = async (req, res) => {
    const {
        nombre, email, password, zona, subzona, direccion, telefono, whatsapp,
        sitio_web, contacto_nombre
    } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ msg: 'Nombre de la bodega, email y contraseña son obligatorios' });
    }

    let connection;
    try {
        const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ msg: 'El correo ya está registrado' });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        let slug = slugify(nombre);
        const [slugExistente] = await connection.query('SELECT id FROM bodegas WHERE slug = ?', [slug]);
        if (slugExistente.length > 0) slug = `${slug}-${Date.now().toString().slice(-5)}`;

        const [bodegaResult] = await connection.query(
            `INSERT INTO bodegas (nombre, slug, zona, subzona, direccion, telefono, whatsapp, email, sitio_web, contacto_nombre, estado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente_contacto')`,
            [nombre, slug, zona || null, subzona || null, direccion || null, telefono || null,
             whatsapp || null, email, sitio_web || null, contacto_nombre || null]
        );
        const bodegaId = bodegaResult.insertId;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const [userResult] = await connection.query(
            `INSERT INTO usuarios (nombre, email, password, rol, bodega_id, telefono)
             VALUES (?, ?, ?, 'bodega', ?, ?)`,
            [contacto_nombre || nombre, email, hashedPassword, bodegaId, telefono || null]
        );
        const nuevoId = userResult.insertId;

        await connection.commit();

        const token = firmarToken({ id: nuevoId, rol: 'bodega', bodega_id: bodegaId });

        try {
            await emailBienvenidaAcceso({ email, password, nombre: contacto_nombre || nombre, rol: 'bodega' });
        } catch (emailError) {
            console.error('Error enviando email de bienvenida a la bodega (no afecta el registro):', emailError.message);
        }

        res.status(201).json({
            token,
            user: { id: nuevoId, nombre: contacto_nombre || nombre, rol: 'bodega', bodega_id: bodegaId },
            bodega: { id: bodegaId, nombre, slug, estado: 'pendiente_contacto' },
            msg: 'Bodega registrada. Un miembro de Mendoza Reserve se va a poner en contacto para activar tu catálogo.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en registerBodega:', error);
        res.status(500).json({ msg: 'Error interno del servidor al registrar la bodega' });
    } finally {
        if (connection) connection.release();
    }
};

// --- ALTA PÚBLICA DE CLOSER (vendedor UK) ---
// A diferencia de la bodega, el closer no crea ninguna fila más — sólo su usuario con
// rol='closer'. No hace falta aprobación de Roberto para poder entrar (a diferencia de
// la bodega), porque el closer no puede ver ni tocar nada sensible hasta que carga sus
// propios leads.
exports.registerCloser = async (req, res) => {
    const { nombre, apellido, email, password, telefono, territorio } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ msg: 'Nombre, email y contraseña son obligatorios' });
    }

    try {
        const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ msg: 'El correo ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // "territorio" (ej. "Bristol and the South West") se guarda en `empresa` para no
        // tener que sumar otra columna sólo para este dato descriptivo del closer.
        const [result] = await db.query(
            `INSERT INTO usuarios (nombre, apellido, email, password, rol, empresa, telefono)
             VALUES (?, ?, ?, ?, 'closer', ?, ?)`,
            [nombre, apellido || null, email, hashedPassword, territorio || null, telefono || null]
        );
        const nuevoId = result.insertId;

        const token = firmarToken({ id: nuevoId, rol: 'closer' });

        try {
            await emailBienvenidaAcceso({ email, password, nombre, rol: 'closer' });
        } catch (emailError) {
            console.error('Error enviando email de bienvenida al closer (no afecta el registro):', emailError.message);
        }

        res.status(201).json({
            token,
            user: { id: nuevoId, nombre, apellido, rol: 'closer' }
        });
    } catch (error) {
        console.error('Error en registerCloser:', error);
        res.status(500).json({ msg: 'Error interno del servidor al registrar el closer' });
    }
};

// --- LOGIN (Mantenemos tu lógica que estaba muy bien) ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(400).json({ msg: "Credenciales incorrectas" });
        }

        const usuario = rows[0];
        const passwordCorrecto = await bcrypt.compare(password, usuario.password);

        if (!passwordCorrecto) {
            return res.status(400).json({ msg: "Credenciales incorrectas" });
        }

        // El JWT de una cuenta de bodega lleva también bodega_id, así el middleware
        // esBodega y los controllers del portal filtran siempre por su propia bodega
        // sin tener que ir a buscarla a la base en cada pedido.
        const payload = { id: usuario.id, rol: usuario.rol };
        if (usuario.rol === 'bodega') payload.bodega_id = usuario.bodega_id;

        const token = firmarToken(payload);

        res.json({
            token,
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol,
                ...(usuario.rol === 'bodega' ? { bodega_id: usuario.bodega_id } : {})
            }
        });

    } catch (error) {
        console.error("Error en Login:", error);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};