// ============================================
// controllers/notificationController.js (Enhanced)
// ============================================
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const notificationService = require('../services/notificationService');
const pushService = require('../services/pushNotificationService');

// Get all notifications for the authenticated user
exports.getUserNotifications = async (req, res, next) => {
  try {
    const notifications = await models.notifications.findAll({
      where: { user_id: req.user.id },
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
      ]
    });
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    next(err);
  }
};

// Send a notification (template + variables supported, multi-channel)
exports.sendNotification = async (req, res, next) => {
  try {
    const { 
      userId, 
      message, 
      templateId, 
      variables, 
      channels, 
      subject, 
      pushTitle, 
      pushData 
    } = req.body;

    // Build options for multi-channel delivery
    const options = {
      channels: channels || ['email'], // Default to email only
      subject: subject || 'Notification',
      pushTitle: pushTitle || 'Notification',
      pushData: pushData || {}
    };

    const notification = await notificationService.sendNotification(
      userId,
      message,
      templateId,
      variables || {},
      options
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
          is_read: false
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
    
    if (!prefs) {
      return res.json({
        user_id: req.user.id,
        email_enabled: true,
        sms_enabled: true,
        push_enabled: true,
        notification_types: {}
      });
    }
    
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

// Register push notification token (Enhanced)
exports.registerPushToken = async (req, res, next) => {
  try {
    const { token, platform } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    // Use the enhanced push service
    await pushService.registerDeviceToken(
      req.user.id, 
      token, 
      platform || 'android'
    );

    res.json({ 
      message: 'Push token registered successfully',
      userId: req.user.id,
      platform: platform || 'android'
    });
  } catch (err) {
    console.error('Error registering push token:', err);
    next(err);
  }
};

// Unregister push notification token (Enhanced)
exports.unregisterPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    await pushService.unregisterDeviceToken(token);

    res.json({ message: 'Push token unregistered successfully' });
  } catch (err) {
    console.error('Error unregistering push token:', err);
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

// Subscribe to notification topic
exports.subscribeToTopic = async (req, res, next) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic required' });
    }

    const result = await pushService.subscribeUserToTopic(req.user.id, topic);
    
    res.json({ 
      message: `Subscribed to topic: ${topic}`,
      result 
    });
  } catch (err) {
    console.error('Error subscribing to topic:', err);
    next(err);
  }
};

// Unsubscribe from notification topic
exports.unsubscribeFromTopic = async (req, res, next) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic required' });
    }

    const result = await pushService.unsubscribeUserFromTopic(req.user.id, topic);
    
    res.json({ 
      message: `Unsubscribed from topic: ${topic}`,
      result 
    });
  } catch (err) {
    console.error('Error unsubscribing from topic:', err);
    next(err);
  }
};

// Send test notification (for testing purposes)
exports.sendTestNotification = async (req, res, next) => {
  try {
    const { channels } = req.body;

    const options = {
      channels: channels || ['push'],
      subject: 'Test Notification',
      pushTitle: 'Test Notification',
      pushData: { type: 'test' }
    };

    const notification = await notificationService.sendNotification(
      req.user.id,
      'This is a test notification to verify your notification settings.',
      null,
      {},
      options
    );

    res.json({
      message: 'Test notification sent',
      data: notification
    });
  } catch (err) {
    console.error('Error sending test notification:', err);
    next(err);
  }
};

// ============================================
// controllers/notificationTemplateController.js
// ============================================

// 📑 Get all templates
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await models.notification_templates.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

// ➕ Create template
exports.createTemplate = async (req, res, next) => {
  try {
    const { name, content, type, variables } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    const template = await models.notification_templates.create({ 
      name, 
      content,
      type: type || 'general',
      variables: variables || {}
    });
    
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

// ✏️ Update template
exports.updateTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, content, type, variables } = req.body;

    const template = await models.notification_templates.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.update({ 
      name, 
      content,
      type,
      variables
    });
    
    res.json(template);
  } catch (err) {
    next(err);
  }
};

// ❌ Delete template
exports.deleteTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const template = await models.notification_templates.findByPk(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Test template with sample variables
exports.testTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variables } = req.body;

    const template = await models.notification_templates.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Apply template variables
    let result = template.content;
    if (variables) {
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, variables[key]);
      });
    }

    res.json({
      template: template.name,
      original: template.content,
      rendered: result,
      variables: variables || {}
    });
  } catch (err) {
    next(err);
  }
};