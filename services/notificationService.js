// services/notificationService.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
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
 * Send a notification to a user
 * @param {number} userId - The user receiving the notification
 * @param {string|null} message - Optional custom message
 * @param {number|null} templateId - Template to use
 * @param {object} variables - Placeholder values (e.g., { name: "Peter", orderId: 123 })
 */
exports.sendNotification = async (userId, message = null, templateId = null, variables = {}) => {
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

    // Save notification in DB
    const notification = await models.notifications.create({
      user_id: userId,
      template_id: templateId,
      message: finalMessage,
      status: "sent",
      created_at: new Date()
    });

    // TODO: Integrate SMS/Email/Push here
    // Example hooks:
    // await sendPushNotification(userId, finalMessage);
    // await sendEmail(userEmail, finalMessage);
    // await sendSMS(userPhone, finalMessage);

    return notification;
  } catch (err) {
    console.error("Error sending notification:", err.message);
    throw err;
  }
};
