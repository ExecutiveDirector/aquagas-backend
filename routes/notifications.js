const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middleware/authMiddleware');


// All notification routes require authentication
router.use(authenticateToken);

// User notifications
router.get('/', notificationController.getUserNotifications); // all notifications for logged-in user
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences);
router.put('/preferences', notificationController.updateNotificationPreferences);

// Push notification tokens
router.post('/token', notificationController.registerPushToken);
router.delete('/token', notificationController.unregisterPushToken);

// Optional: Admin or service endpoint to send notifications
router.post('/send', notificationController.sendNotification);

module.exports = router;
