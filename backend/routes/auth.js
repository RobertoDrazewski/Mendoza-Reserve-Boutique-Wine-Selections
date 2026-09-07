const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de autenticación
router.post('/register', authController.register);
router.post('/register-bodega', authController.registerBodega);
router.post('/register-closer', authController.registerCloser);
router.post('/login', authController.login);

module.exports = router;