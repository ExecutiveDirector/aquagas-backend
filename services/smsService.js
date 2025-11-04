// ============================================
// services/smsService.js
// ============================================
const axios = require('axios');

/**
 * Send SMS using Africa's Talking or similar SMS gateway
 * @param {string} phoneNumber - Recipient phone number (format: +254712345678)
 * @param {string} message - SMS content
 */
exports.sendSMS = async (phoneNumber, message) => {
  try {
    // Example using Africa's Talking API
    const response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      {
        username: process.env.AFRICAS_TALKING_USERNAME,
        to: phoneNumber,
        message: message,
        from: process.env.AFRICAS_TALKING_SHORTCODE
      },
      {
        headers: {
          'apiKey': process.env.AFRICAS_TALKING_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`📱 SMS sent to ${phoneNumber}`);
    return { success: true, response: response.data };
  } catch (err) {
    console.error('Error sending SMS:', err.message);
    throw err;
  }
};
