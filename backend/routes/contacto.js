const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Ruta pública para enviar mensaje
router.post('/', contactoController.enviarMensaje);

// Ruta protegida para que el Admin vea los mensajes
router.get('/', [verificarToken, esAdmin], contactoController.getMensajes);

module.exports = router;