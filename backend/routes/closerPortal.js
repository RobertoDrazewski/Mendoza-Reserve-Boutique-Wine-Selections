const express = require('express');
const router = express.Router();
const closerPortalController = require('../controllers/closerPortalController');
const { verificarToken, esCloser } = require('../middleware/auth');

// Todo este módulo requiere estar logueado con una cuenta de closer (ver
// authController.registerCloser / login).
router.use(verificarToken, esCloser);

router.get('/leads', closerPortalController.getMisLeads);
router.post('/leads', closerPortalController.crearMiLead);
router.put('/leads/:id', closerPortalController.actualizarMiLead);

router.get('/bodegas', closerPortalController.getBodegasParaCloser);

module.exports = router;
