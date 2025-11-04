// ============================================
// routes/notificationTemplateRoutes.js (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const notificationTemplateController = require('../controllers/notificationTemplateController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All template routes require authentication (ideally admin only)
router.use(authenticateToken);

// Manage templates
router.get('/', notificationTemplateController.getTemplates);
router.post('/', notificationTemplateController.createTemplate);
router.put('/:id', notificationTemplateController.updateTemplate);
router.delete('/:id', notificationTemplateController.deleteTemplate);

// Test template with variables
// router.post('/:id/test', notificationTemplateController.testTemplate);

module.exports = router;