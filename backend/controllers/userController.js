const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- REGISTRO DE USUARIOS ---
exports.register = async (req, res) => {
    const { nombre, apellido, email, password } = req.body;

    try {
        // 1. Verificar si el usuario ya existe
        const [existingUser] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ msg: "El correo ya está registrado" });
        }

        // 2. Encriptar la contraseña (seguridad obligatoria)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Insertar en Aiven
        await db.query(
            'INSERT INTO usuarios (nombre, apellido, email, password, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword, 'cliente']
        );

        res.status(201).json({ msg: "Usuario registrado con éxito en la nube" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al registrar usuario" });
    }
};

// --- LOGIN DE USUARIOS ---
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar usuario
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(400).json({ msg: "Credenciales inválidas" });
        }

        const user = rows[0];

        // 2. Comparar contraseña encriptada
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Credenciales inválidas" });
        }

        // 3. Crear Token (JWT) para mantener la sesión
        const token = jwt.sign(
            { id: user.id, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error en el servidor durante el login" });
    }
};

// --- TUS FUNCIONES EXISTENTES (Perfil y Admin) ---
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, nombre, apellido, email, rol, fecha_registro FROM usuarios WHERE id = ?', 
            [req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ msg: "Usuario no encontrado" });
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener el perfil" });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, nombre, apellido, email, rol, activo FROM usuarios ORDER BY fecha_registro DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: "Error al obtener la lista" });
    }
};