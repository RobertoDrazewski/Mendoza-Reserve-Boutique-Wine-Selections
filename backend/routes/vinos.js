const express = require('express');
const router = express.Router();
const vinoController = require('../controllers/vinoController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Rutas Públicas
router.get('/', vinoController.getAllVinos);
router.get('/:id', vinoController.getVinoById);

// Rutas Protegidas (Asegúrate de que estas funciones existan en el controlador arriba)
router.post('/', verificarToken, esAdmin, vinoController.createVino);
router.put('/:id', verificarToken, esAdmin, vinoController.updateVino); // Línea 28 corregida
router.delete('/:id', verificarToken, esAdmin, vinoController.deleteVino);

module.exports = router;