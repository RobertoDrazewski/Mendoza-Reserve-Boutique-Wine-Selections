const express = require('express');
const router = express.Router();
const vinoController = require('../controllers/vinoController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Rutas Públicas
router.get('/', vinoController.getAllVinos);
router.get('/bodega/:bodegaId', vinoController.getVinosByBodega);

// Ruta ADMIN (antes de '/:id' para que no choquen) — catálogo completo de una bodega,
// sin filtrar por activo/estado, para el panel de administración.
router.get('/admin/bodega/:bodegaId', verificarToken, esAdmin, vinoController.getVinosByBodegaAdmin);

router.get('/:id', vinoController.getVinoById);

// Rutas Protegidas (sólo admin — el catálogo lo carga Roberto a partir de lo que le manda la bodega)
router.post('/', verificarToken, esAdmin, vinoController.createVino);
router.put('/:id', verificarToken, esAdmin, vinoController.updateVino);
router.delete('/:id', verificarToken, esAdmin, vinoController.deleteVino);

module.exports = router;
