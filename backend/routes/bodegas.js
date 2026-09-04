const express = require('express');
const router = express.Router();
const bodegaController = require('../controllers/bodegaController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// --- RUTAS ADMIN (van antes que '/:id' para no chocar con el parámetro) ---
router.get('/admin', [verificarToken, esAdmin], bodegaController.getAllBodegasAdmin);
router.patch('/:id/estado', [verificarToken, esAdmin], bodegaController.cambiarEstadoBodega);
router.post('/:id/imagen', [verificarToken, esAdmin], (req, res, next) => {
    bodegaController.uploadImagenMiddleware(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message || 'Error al subir la imagen.' });
        next();
    });
}, bodegaController.subirImagenBodega);
router.post('/:id/generar-bio', [verificarToken, esAdmin], bodegaController.generarBioBodega);

// --- RUTAS PÚBLICAS ---
// Cualquier usuario (logueado o no) puede ver el listado (sólo activas) y el detalle
router.get('/', bodegaController.getAllBodegas);
router.get('/:id', bodegaController.getBodegaById);

// --- RUTAS PROTEGIDAS (Solo Admin) ---
router.post('/', [verificarToken, esAdmin], bodegaController.createBodega);
router.put('/:id', [verificarToken, esAdmin], bodegaController.updateBodega);
router.delete('/:id', [verificarToken, esAdmin], bodegaController.deleteBodega);

module.exports = router;
