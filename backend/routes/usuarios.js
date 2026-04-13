const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Importamos los middlewares de seguridad
const { verificarToken, esAdmin } = require('../middleware/auth');

/**
 * RUTA: POST /api/usuarios/registrar
 * ACCESO: Público (Cualquier visitante)
 */
router.post('/registrar', userController.register);

/**
 * RUTA: POST /api/usuarios/login
 * ACCESO: Público (Cualquier visitante)
 */
router.post('/login', userController.login);

/**
 * RUTA: GET /api/usuarios/perfil
 * ACCESO: Privado (Cliente o Admin con Token)
 */
router.get('/perfil', verificarToken, userController.getProfile);

/**
 * RUTA: GET /api/usuarios/todos
 * ACCESO: Protegido (Solo Administradores)
 */
router.get('/todos', [verificarToken, esAdmin], userController.getAllUsers);

module.exports = router;