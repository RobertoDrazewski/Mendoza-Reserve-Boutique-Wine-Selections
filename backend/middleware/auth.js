const jwt = require('jsonwebtoken');
const JWT_SECRET = "MendozaReserve_Secret_Key_2026"; 

// 1. Verificar si el usuario está autenticado
exports.verificarToken = (req, res, next) => {
    const authHeader = req.header('Authorization');
    
    // Verificamos que el header exista y tenga el formato "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ msg: "Acceso denegado. Formato de token inválido o inexistente." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const cifrado = jwt.verify(token, JWT_SECRET);
        req.user = cifrado; // Cargamos el payload (id, rol, nombre) en la solicitud
        next();
    } catch (error) {
        console.error("Error JWT:", error.message);
        res.status(401).json({ msg: "Token no válido o expirado." });
    }
};

// 2. Verificar si el usuario tiene privilegios de Admin
exports.esAdmin = (req, res, next) => {
    // El 'verificarToken' siempre debe ir antes que este en la ruta
    if (!req.user) {
        return res.status(500).json({ msg: "Error interno: el usuario no fue autenticado previamente." });
    }

    if (req.user.rol !== 'admin') {
        return res.status(403).json({ msg: "Acceso denegado: se requiere rol de administrador." });
    }
    
    next();
};