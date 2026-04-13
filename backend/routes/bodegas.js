const express = require('express');
const router = express.Router();
const bodegaController = require('../controllers/bodegaController');

// Importamos los middlewares de autorización
// Nota: Asegúrate de que tu archivo 'middleware/auth.js' exporte estas funciones
const { verificarToken, esAdmin } = require('../middleware/auth');

// --- RUTAS PÚBLICAS ---
// Cualquier usuario (logueado o no) puede ver el listado y el detalle
router.get('/', bodegaController.getAllBodegas);
router.get('/:id', bodegaController.getBodegaById);

// --- RUTAS PROTEGIDAS (Solo Admin) ---
// Aplicamos ambos middlewares en cadena: primero valida el token, luego el rol
router.post('/', [verificarToken, esAdmin], bodegaController.createBodega);
router.put('/:id', [verificarToken, esAdmin], bodegaController.updateBodega);
router.delete('/:id', [verificarToken, esAdmin], bodegaController.deleteBodega);

module.exports = router;