const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { verificarToken, esAdmin } = require('../middleware/auth');

// Todo el módulo de leads es privado (uso interno de Roberto para su campaña UK)
router.use(verificarToken, esAdmin);

router.get('/', leadController.getAllLeads);
router.post('/bulk', leadController.createLeadsBulk);
router.get('/:id', leadController.getLeadById);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.delete('/:id', leadController.deleteLead);

module.exports = router;
