const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verificarToken, esAdmin } = require('../middleware/auth');

/**
 * --- RUTAS PÚBLICAS (sin login) ---
 * El link de aceptación de la bodega y el seguimiento del comprador no requieren cuenta.
 */
router.get('/track/:cartGroupId', orderController.getOrderGroupPublic);
router.get('/accept/:token', orderController.getOrderByAcceptToken);
router.post('/accept/:token', orderController.respondToOrder);

/**
 * --- RUTAS ADMIN ---
 * Antes de '/:id' para que no choquen con el parámetro.
 */
router.get('/admin', [verificarToken, esAdmin], orderController.getAllOrdersAdmin);
router.put('/admin/:id', [verificarToken, esAdmin], orderController.updateOrderAdmin);

/**
 * --- RUTAS DE COMPRADOR (requieren login) ---
 */
router.post('/', verificarToken, orderController.createOrder);
router.get('/mis-ordenes', verificarToken, orderController.getUserOrders);
router.get('/:id', verificarToken, orderController.getOrderById);

module.exports = router;
