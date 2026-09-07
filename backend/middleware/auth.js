const jwt = require('jsonwebtoken');

// El secreto SIEMPRE sale de la variable de entorno JWT_SECRET (ver backend/.env.example).
// No hay fallback hardcodeado: si falta la env var, el server no debe firmar/verificar tokens
// con un valor conocido públicamente en el repo.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ Falta la variable de entorno JWT_SECRET. Definila antes de arrancar el servidor.');
}

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

// 3. Verificar si el usuario es una bodega (portal de autogestión de bodega).
// El JWT de un usuario rol='bodega' lleva también bodega_id (ver authController.js) —
// eso es lo que usan los controllers del portal para filtrar SIEMPRE por su propia
// bodega, sin confiar en ningún bodega_id que venga en el body/params del pedido.
exports.esBodega = (req, res, next) => {
    if (!req.user) {
        return res.status(500).json({ msg: "Error interno: el usuario no fue autenticado previamente." });
    }
    if (req.user.rol !== 'bodega') {
        return res.status(403).json({ msg: "Acceso denegado: se requiere una cuenta de bodega." });
    }
    if (!req.user.bodega_id) {
        return res.status(409).json({ msg: "Esta cuenta de bodega todavía no está vinculada a una bodega." });
    }
    next();
};

// 4. Verificar si el usuario es un closer (vendedor UK — portal de leads/bodegas)
exports.esCloser = (req, res, next) => {
    if (!req.user) {
        return res.status(500).json({ msg: "Error interno: el usuario no fue autenticado previamente." });
    }
    if (req.user.rol !== 'closer') {
        return res.status(403).json({ msg: "Acceso denegado: se requiere una cuenta de closer." });
    }
    next();
};