const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const notificationService = require('../services/notificationService');

// Get all notifications for the authenticated user
exports.getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await models.notifications.findAll({
      where: { user_id: req.user.id }, // Using req.user.id from JWT
      include: [{ model: models.notification_templates, as: 'template' }],
      order: [['created_at', 'DESC']],
      attributes: [
        'notification_id',
        'user_id', 
        'notification_type',
        'title',
        'message',
        'action_url',
        'is_read',
        'read_at',
        'priority',
        'related_entity_type',
        'related_entity_id',
        'template_id',
        'created_at'
      ] // Explicitly specify columns to avoid updated_at issues
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    next(err);
  }
};

// Send a notification (template + variables supported)
exports.sendNotification = async (req, res, next) => {
  try {
    const { userId, message, templateId, variables } = req.body;

    const notification = await notificationService.sendNotification(
      userId,
      message,
      templateId,
      variables || {}
    );

    res.status(201).json({
      message: 'Notification sent successfully',
      data: notification,
    });
  } catch (err) {
    next(err);
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await models.notifications.findByPk(notificationId);
    
    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Update both is_read flag and read_at timestamp
    notification.is_read = true;
    notification.read_at = new Date();
    await notification.save();
    
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await models.notifications.update(
      { 
        is_read: true,
        read_at: new Date() 
      },
      { 
        where: { 
          user_id: req.user.id, 
          is_read: false // Only update unread notifications
        } 
      }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// Delete a notification
exports.deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await models.notifications.findByPk(notificationId);
    
    if (!notification || notification.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await notification.destroy();
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

// Get user notification preferences
exports.getNotificationPreferences = async (req, res, next) => {
  try {
    const prefs = await models.notification_preferences.findOne({
      where: { user_id: req.user.id },
    });
    res.json(prefs);
  } catch (err) {
    next(err);
  }
};

// Update user notification preferences
exports.updateNotificationPreferences = async (req, res, next) => {
  try {
    const updates = req.body;
    const prefs = await models.notification_preferences.findOne({
      where: { user_id: req.user.id },
    });

    if (prefs) {
      Object.assign(prefs, updates);
      await prefs.save();
    } else {
      await models.notification_preferences.create({
        user_id: req.user.id,
        ...updates,
      });
    }

    res.json({ message: 'Notification preferences updated' });
  } catch (err) {
    next(err);
  }
};

// Register push notification token
exports.registerPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    await models.push_tokens.upsert({
      user_id: req.user.id,
      token,
      updated_at: new Date(),
    });

    res.json({ message: 'Push token registered' });
  } catch (err) {
    next(err);
  }
};

// Unregister push notification token
exports.unregisterPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    await models.push_tokens.destroy({
      where: { user_id: req.user.id, token },
    });

    res.json({ message: 'Push token unregistered' });
  } catch (err) {
    next(err);
  }
};

// Get notification count (unread)
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await models.notifications.count({
      where: { 
        user_id: req.user.id,
        is_read: false 
      }
    });
    res.json({ unreadCount: count });
  } catch (err) {
    next(err);
  }
};