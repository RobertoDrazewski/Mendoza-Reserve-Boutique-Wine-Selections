const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verificarToken } = require('../middleware/auth');

/**
 * --- RUTAS DE ÓRDENES (PROTEGIDAS) ---
 * Todas estas rutas requieren que el usuario envíe su JWT en el Header
 */

// 1. Crear una nueva orden (POST /api/orders)
// Se ejecuta cuando el usuario hace clic en "Finalizar Compra"
router.post('/', verificarToken, orderController.createOrder);

// 2. Obtener historial (GET /api/orders/mis-ordenes)
// Es importante que esta ruta esté ANTES de la ruta con parámetro :id
router.get('/mis-ordenes', verificarToken, orderController.getUserOrders);

// 3. Detalles de una orden (GET /api/orders/:id)
// Útil para ver qué vinos específicos tenía una compra vieja
router.get('/:id', verificarToken, orderController.getOrderById);

module.exports = router;