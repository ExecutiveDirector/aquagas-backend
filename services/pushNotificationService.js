// ============================================
// services/pushNotificationService.js
// ============================================
const admin = require('firebase-admin');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// Initialize Firebase Admin SDK
let firebaseApp = null;

function initializeFirebase() {
  if (!firebaseApp) {
    try {
      // Option 1: Use service account file
      const serviceAccount = require('../config/firebase-service-account.json');
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      
      // Option 2: Use environment variables (uncomment if preferred)
      // firebaseApp = admin.initializeApp({
      //   credential: admin.credential.cert({
      //     projectId: process.env.FIREBASE_PROJECT_ID,
      //     clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      //     privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      //   })
      // });
      
      console.log('✅ Firebase Admin SDK initialized');
    } catch (err) {
      console.error('❌ Firebase initialization failed:', err.message);
    }
  }
  return firebaseApp;
}

/**
 * Send push notification to a single device
 * @param {string} deviceToken - FCM device token
 * @param {object} notification - Notification payload { title, body, data }
 */
async function sendToDevice(deviceToken, notification) {
  initializeFirebase();
  
  const message = {
    token: deviceToken,
    notification: {
      title: notification.title || 'Notification',
      body: notification.body
    },
    data: notification.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`📲 Push notification sent successfully:`, response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('Error sending push notification:', err.message);
    throw err;
  }
}

/**
 * Send push notification to multiple devices
 * @param {array} deviceTokens - Array of FCM device tokens
 * @param {object} notification - Notification payload { title, body, data }
 */
async function sendToMultipleDevices(deviceTokens, notification) {
  initializeFirebase();
  
  const message = {
    tokens: deviceTokens,
    notification: {
      title: notification.title || 'Notification',
      body: notification.body
    },
    data: notification.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`📲 Sent ${response.successCount} of ${deviceTokens.length} notifications`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(deviceTokens[idx]);
          console.error(`Failed to send to token ${deviceTokens[idx]}:`, resp.error);
        }
      });
      
      // Remove invalid tokens from database
      await removeInvalidTokens(failedTokens);
    }
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (err) {
    console.error('Error sending push notifications:', err.message);
    throw err;
  }
}

/**
 * Send push notification to a topic (group of users)
 * @param {string} topic - Topic name (e.g., 'all-users', 'premium-members')
 * @param {object} notification - Notification payload { title, body, data }
 */
async function sendToTopic(topic, notification) {
  initializeFirebase();
  
  const message = {
    topic: topic,
    notification: {
      title: notification.title || 'Notification',
      body: notification.body
    },
    data: notification.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`📲 Push notification sent to topic "${topic}":`, response);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('Error sending push notification to topic:', err.message);
    throw err;
  }
}

/**
 * Subscribe device tokens to a topic
 * @param {array} tokens - Array of device tokens
 * @param {string} topic - Topic name
 */
async function subscribeToTopic(tokens, topic) {
  initializeFirebase();
  
  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    console.log(`✅ ${response.successCount} devices subscribed to topic "${topic}"`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (err) {
    console.error('Error subscribing to topic:', err.message);
    throw err;
  }
}

/**
 * Unsubscribe device tokens from a topic
 * @param {array} tokens - Array of device tokens
 * @param {string} topic - Topic name
 */
async function unsubscribeFromTopic(tokens, topic) {
  initializeFirebase();
  
  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    console.log(`✅ ${response.successCount} devices unsubscribed from topic "${topic}"`);
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (err) {
    console.error('Error unsubscribing from topic:', err.message);
    throw err;
  }
}

/**
 * Remove invalid device tokens from database
 * @param {array} tokens - Array of invalid tokens
 */
async function removeInvalidTokens(tokens) {
  try {
    await models.device_tokens.destroy({
      where: {
        token: tokens
      }
    });
    console.log(`🗑️ Removed ${tokens.length} invalid device tokens`);
  } catch (err) {
    console.error('Error removing invalid tokens:', err.message);
  }
}

/**
 * Send push notification to a user (all their devices)
 * @param {number} userId - User ID
 * @param {object} notification - Notification payload { title, body, data }
 */
exports.sendPushNotification = async (userId, notification) => {
  try {
    // Get all device tokens for the user
    const deviceTokens = await models.device_tokens.findAll({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (deviceTokens.length === 0) {
      console.log(`⚠️ No active device tokens found for user ${userId}`);
      return { success: false, error: 'No device tokens found' };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    
    if (tokens.length === 1) {
      return await sendToDevice(tokens[0], notification);
    } else {
      return await sendToMultipleDevices(tokens, notification);
    }
  } catch (err) {
    console.error('Error sending push notification:', err.message);
    throw err;
  }
};

/**
 * Register a device token for push notifications
 * @param {number} userId - User ID
 * @param {string} token - FCM device token
 * @param {string} platform - Device platform (ios, android, web)
 */
exports.registerDeviceToken = async (userId, token, platform = 'android') => {
  try {
    // Check if token already exists
    const existingToken = await models.device_tokens.findOne({
      where: { token }
    });

    if (existingToken) {
      // Update existing token
      await existingToken.update({
        user_id: userId,
        platform,
        is_active: true,
        updated_at: new Date()
      });
      console.log(`♻️ Updated device token for user ${userId}`);
    } else {
      // Create new token
      await models.device_tokens.create({
        user_id: userId,
        token,
        platform,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`✅ Registered new device token for user ${userId}`);
    }

    return { success: true };
  } catch (err) {
    console.error('Error registering device token:', err.message);
    throw err;
  }
};

/**
 * Unregister a device token
 * @param {string} token - FCM device token to remove
 */
exports.unregisterDeviceToken = async (token) => {
  try {
    await models.device_tokens.update(
      { is_active: false, updated_at: new Date() },
      { where: { token } }
    );
    console.log(`🔕 Unregistered device token`);
    return { success: true };
  } catch (err) {
    console.error('Error unregistering device token:', err.message);
    throw err;
  }
};

/**
 * Send push notification to all users (broadcast)
 * @param {object} notification - Notification payload { title, body, data }
 */
exports.broadcastPushNotification = async (notification) => {
  return await sendToTopic('all-users', notification);
};

/**
 * Subscribe user to a topic
 * @param {number} userId - User ID
 * @param {string} topic - Topic name
 */
exports.subscribeUserToTopic = async (userId, topic) => {
  try {
    const deviceTokens = await models.device_tokens.findAll({
      where: { user_id: userId, is_active: true }
    });

    if (deviceTokens.length === 0) {
      return { success: false, error: 'No device tokens found' };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return await subscribeToTopic(tokens, topic);
  } catch (err) {
    console.error('Error subscribing user to topic:', err.message);
    throw err;
  }
};

/**
 * Unsubscribe user from a topic
 * @param {number} userId - User ID
 * @param {string} topic - Topic name
 */
exports.unsubscribeUserFromTopic = async (userId, topic) => {
  try {
    const deviceTokens = await models.device_tokens.findAll({
      where: { user_id: userId, is_active: true }
    });

    if (deviceTokens.length === 0) {
      return { success: false, error: 'No device tokens found' };
    }

    const tokens = deviceTokens.map(dt => dt.token);
    return await unsubscribeFromTopic(tokens, topic);
  } catch (err) {
    console.error('Error unsubscribing user from topic:', err.message);
    throw err;
  }
};

module.exports = exports;