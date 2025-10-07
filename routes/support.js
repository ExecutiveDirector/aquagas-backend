
// -----------------------------------
// routes/support.js - Customer support
// -----------------------------------
const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

// Support tickets
router.post('/tickets', authenticateToken, supportController.createTicket);
router.get('/tickets', authenticateToken, supportController.getUserTickets);
router.get('/tickets/:ticketId', authenticateToken, supportController.getTicketDetails);

// Support messages
router.post('/tickets/:ticketId/messages', authenticateToken, supportController.addMessage);
router.get('/tickets/:ticketId/messages', optionalAuth, supportController.getTicketMessages);

// FAQ and help
router.get('/faq', supportController.getFAQ);
router.get('/help-topics', supportController.getHelpTopics);
// GET /api/support/faq - Get all FAQs (with optional category filter)
// POST /api/support/faq/:id/helpful - Increment helpful count for FAQ
module.exports = router;