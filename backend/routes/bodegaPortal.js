const express = require('express');
const router = express.Router();
const bodegaPortalController = require('../controllers/bodegaPortalController');
const { verificarToken, esBodega } = require('../middleware/auth');

// Todo este módulo requiere estar logueado con una cuenta de bodega (ver
// authController.registerBodega / login) — esBodega además exige que la cuenta ya
// tenga bodega_id vinculado.
router.use(verificarToken, esBodega);

router.get('/perfil', bodegaPortalController.getMiPerfil);
router.put('/perfil', bodegaPortalController.updateMiPerfil);

router.get('/catalogo', bodegaPortalController.getMiCatalogo);
router.post('/catalogo', bodegaPortalController.crearMiVino);
router.put('/catalogo/:id', bodegaPortalController.actualizarMiVino);
router.delete('/catalogo/:id', bodegaPortalController.eliminarMiVino);

router.get('/pedidos', bodegaPortalController.getMisPedidos);
router.get('/pedidos/:id', bodegaPortalController.getMiPedidoById);
router.patch('/pedidos/:id/despachar', bodegaPortalController.despacharMiPedido);

module.exports = router;
