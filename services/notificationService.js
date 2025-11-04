// ============================================
// services/notificationService.js (Enhanced with Push)
// ============================================
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { sendPushNotification } = require('./pushNotificationService');
const models = initModels(sequelize);

/**
 * Replace placeholders in template content with actual values
 * Example: "Hi {{name}}, your order {{orderId}} is ready"
 */
function applyTemplate(content, variables = {}) {
  let result = content;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key]);
  });
  return result;
}

/**
 * Send a notification to a user via multiple channels
 * @param {number} userId - The user receiving the notification
 * @param {string|null} message - Optional custom message
 * @param {number|null} templateId - Template to use
 * @param {object} variables - Placeholder values (e.g., { name: "Peter", orderId: 123 })
 * @param {object} options - Additional options { 
 *   channels: ['email', 'sms', 'push'], 
 *   subject: 'Email Subject',
 *   pushTitle: 'Push Notification Title',
 *   pushData: { key: 'value' } // Custom data for push notifications
 * }
 */
exports.sendNotification = async (userId, message = null, templateId = null, variables = {}, options = {}) => {
  try {
    let finalMessage = message;

    // Apply template if provided
    if (templateId) {
      const template = await models.notification_templates.findByPk(templateId);
      if (!template) throw new Error("Notification template not found");
      finalMessage = applyTemplate(template.content, variables);
    }

    if (!finalMessage) throw new Error("Either a message or a templateId must be provided");

    console.log(`📩 Sending notification to user ${userId}: ${finalMessage}`);

    // Get user details for contact information
    const user = await models.users.findByPk(userId);
    if (!user) throw new Error("User not found");

    // Save notification in DB
    const notification = await models.notifications.create({
      user_id: userId,
      template_id: templateId,
      message: finalMessage,
      status: "sent",
      created_at: new Date()
    });

    // Send via specified channels
    const channels = options.channels || ['email'];
    const results = {};

    // Send Email
    if (channels.includes('email') && user.email) {
      try {
        results.email = await sendEmail(user.email, finalMessage, options.subject);
      } catch (err) {
        console.error('Email send failed:', err.message);
        results.email = { success: false, error: err.message };
      }
    }

    // Send SMS
    if (channels.includes('sms') && user.phone) {
      try {
        results.sms = await sendSMS(user.phone, finalMessage);
      } catch (err) {
        console.error('SMS send failed:', err.message);
        results.sms = { success: false, error: err.message };
      }
    }

    // Send Push Notification
    if (channels.includes('push')) {
      try {
        const pushPayload = {
          title: options.pushTitle || 'Notification',
          body: finalMessage,
          data: options.pushData || {}
        };
        results.push = await sendPushNotification(userId, pushPayload);
      } catch (err) {
        console.error('Push notification send failed:', err.message);
        results.push = { success: false, error: err.message };
      }
    }

    return { notification, deliveryResults: results };
  } catch (err) {
    console.error("Error sending notification:", err.message);
    throw err;
  }
};

/**
 * Get all notifications for a user
 * @param {number} userId - The user ID
 * @param {number} limit - Maximum number of notifications to return
 */
exports.getUserNotifications = async (userId, limit = 50) => {
  try {
    const notifications = await models.notifications.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit
    });
    return notifications;
  } catch (err) {
    console.error("Error fetching notifications:", err.message);
    throw err;
  }
};

/**
 * Mark notification as read
 * @param {number} notificationId - The notification ID
 */
exports.markAsRead = async (notificationId) => {
  try {
    await models.notifications.update(
      { status: 'read' },
      { where: { id: notificationId } }
    );
    return { success: true };
  } catch (err) {
    console.error("Error marking notification as read:", err.message);
    throw err;
  }
};