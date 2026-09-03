const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Público (no requiere login): la identidad del pedido se verifica con
// cart_group_id + email, igual que /api/orders/track.
router.post('/order-status', chatController.chatOrderStatus);

module.exports = router;
