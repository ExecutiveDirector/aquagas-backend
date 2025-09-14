const express = require('express');
const router = express.Router();
const notificationTemplateController = require('../controllers/notificationTemplateController');
const { authenticateToken } = require('../middleware/authMiddleware'); // ✅ use correct middleware

// Manage templates (admin only ideally)
router.get('/', authenticateToken, notificationTemplateController.getTemplates);
router.post('/', authenticateToken, notificationTemplateController.createTemplate);
router.put('/:id', authenticateToken, notificationTemplateController.updateTemplate);
router.delete('/:id', authenticateToken, notificationTemplateController.deleteTemplate);

module.exports = router;
