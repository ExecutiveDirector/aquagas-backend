// ============================================
// routes/notificationRoutes.js (Enhanced)
// ============================================
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(authenticateToken);

// User notifications
router.get('/', notificationController.getUserNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);
router.put('/preferences', notificationController.updateNotificationPreferences);

// Push notification device tokens
router.post('/token', notificationController.registerPushToken);
router.delete('/token', notificationController.unregisterPushToken);

// Push notification topics (for group messaging)
router.post('/topics/subscribe', notificationController.subscribeToTopic);
router.post('/topics/unsubscribe', notificationController.unsubscribeFromTopic);

// Send notification (admin or service endpoint)
router.post('/send', notificationController.sendNotification);

// Test notification
router.post('/test', notificationController.sendTestNotification);

module.exports = router;
