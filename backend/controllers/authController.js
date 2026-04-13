const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "MendozaReserve_Secret_Key_2026"; 

// --- REGISTRO REPARADO ---
exports.register = async (req, res) => {
    // 1. Desestructuramos los datos
    const { nombre, apellido, email, password, rol } = req.body;

    try {
        // 2. Verificar si el email ya existe
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ msg: "El correo ya está registrado" });
        }

        // 3. Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const usuarioRol = rol || 'cliente';

        // 4. Insertar usuario
        // IMPORTANTE: Asegúrate de que tu tabla en MySQL tenga la columna 'apellido'
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword, usuarioRol]
        );

        const nuevoId = result.insertId;

        // 5. GENERAR TOKEN INMEDIATAMENTE (Para que el login sea automático)
        const token = jwt.sign(
            { id: nuevoId, rol: usuarioRol }, 
            JWT_SECRET,
            { expiresIn: '24h' }
        );

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

        const token = jwt.sign(
            { id: usuario.id, rol: usuario.rol }, 
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error en Login:", error);
        res.status(500).json({ msg: "Error en el servidor" });
    }
};