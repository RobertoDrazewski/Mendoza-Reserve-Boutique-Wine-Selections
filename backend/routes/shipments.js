const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/shipmentController');
const { verificarToken, esAdmin } = require('../middleware/auth');

router.get('/:orderId', verificarToken, shipmentController.getShipmentByOrder);
router.put('/:orderId', [verificarToken, esAdmin], shipmentController.updateShipment);

module.exports = router;
