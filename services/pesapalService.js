// ============================================
// services/pesapalService.js
// ============================================

const axios = require('axios');
const crypto = require('crypto');

// Pesapal API URLs
const PESAPAL_BASE_URL = process.env.PESAPAL_ENV === 'production' 
  ? 'https://pay.pesapal.com/v3'
  : 'https://cybqa.pesapal.com/pesapalv3';

/**
 * Generate OAuth token for Pesapal API
 */
async function getAccessToken() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;

  try {
    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Auth/RequestToken`,
      {
        consumer_key: consumerKey,
        consumer_secret: consumerSecret
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log('✅ Pesapal access token obtained');
    return response.data.token;
  } catch (err) {
    console.error('Error getting Pesapal access token:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Register IPN (Instant Payment Notification) URL
 * This should be called once during setup
 */
exports.registerIPN = async (ipnUrl, notificationType = 'GET') => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`,
      {
        url: ipnUrl,
        ipn_notification_type: notificationType
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log('✅ IPN URL registered:', response.data);
    return response.data;
  } catch (err) {
    console.error('Error registering IPN:', err.response?.data || err.message);
    throw err;
  }
};

/**
 * Get registered IPN URLs
 */
exports.getIPNs = async () => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PESAPAL_BASE_URL}/api/URLSetup/GetIpnList`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    return response.data;
  } catch (err) {
    console.error('Error getting IPNs:', err.response?.data || err.message);
    throw err;
  }
};

/**
 * Process Pesapal payment - Submit order request
 * @param {Object} orderData - Order details
 * @param {string} orderData.id - Unique order ID (merchant reference)
 * @param {string} orderData.currency - Currency code (e.g., 'KES', 'USD')
 * @param {number} orderData.amount - Amount to charge
 * @param {string} orderData.description - Transaction description
 * @param {string} orderData.callbackUrl - Redirect URL after payment
 * @param {Object} orderData.billingAddress - Customer billing details
 * @param {string} orderData.billingAddress.email_address - Customer email
 * @param {string} orderData.billingAddress.phone_number - Customer phone
 * @param {string} orderData.billingAddress.first_name - Customer first name
 * @param {string} orderData.billingAddress.last_name - Customer last name
 */
exports.processPayment = async (orderData) => {
  try {
    const accessToken = await getAccessToken();
    
    // Get registered IPN ID
    const ipns = await exports.getIPNs();
    const ipnId = ipns[0]?.ipn_id || process.env.PESAPAL_IPN_ID;

    if (!ipnId) {
      throw new Error('No IPN registered. Please register IPN first using registerIPN()');
    }

    const payload = {
      id: orderData.id,
      currency: orderData.currency || 'KES',
      amount: parseFloat(orderData.amount),
      description: orderData.description || 'Payment',
      callback_url: orderData.callbackUrl || process.env.PESAPAL_CALLBACK_URL,
      notification_id: ipnId,
      billing_address: {
        email_address: orderData.billingAddress.email_address,
        phone_number: orderData.billingAddress.phone_number,
        country_code: orderData.billingAddress.country_code || 'KE',
        first_name: orderData.billingAddress.first_name,
        last_name: orderData.billingAddress.last_name,
        line_1: orderData.billingAddress.line_1 || '',
        line_2: orderData.billingAddress.line_2 || '',
        city: orderData.billingAddress.city || '',
        state: orderData.billingAddress.state || '',
        postal_code: orderData.billingAddress.postal_code || '',
        zip_code: orderData.billingAddress.zip_code || ''
      }
    };

    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log(`💳 Pesapal payment initiated for order ${orderData.id}`);
    console.log(`🔗 Redirect URL: ${response.data.redirect_url}`);

    return {
      success: true,
      orderTrackingId: response.data.order_tracking_id,
      merchantReference: response.data.merchant_reference,
      redirectUrl: response.data.redirect_url,
      error: response.data.error,
      status: response.data.status
    };
  } catch (err) {
    console.error('Error processing Pesapal payment:', err.response?.data || err.message);
    throw err;
  }
};

/**
 * Query Pesapal transaction status
 * @param {string} orderTrackingId - The order tracking ID from submit order
 */
exports.queryPaymentStatus = async (orderTrackingId) => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json'
        }
      }
    );

    console.log(`📊 Transaction status for ${orderTrackingId}:`, response.data.payment_status_description);

    return {
      paymentMethod: response.data.payment_method,
      amount: response.data.amount,
      currency: response.data.currency,
      paymentStatusDescription: response.data.payment_status_description,
      description: response.data.description,
      message: response.data.message,
      paymentAccount: response.data.payment_account,
      callbackUrl: response.data.call_back_url,
      status: response.data.status,
      merchantReference: response.data.merchant_reference,
      createdDate: response.data.created_date,
      confirmationCode: response.data.confirmation_code
    };
  } catch (err) {
    console.error('Error querying Pesapal status:', err.response?.data || err.message);
    throw err;
  }
};

/**
 * Refund a transaction
 * @param {string} confirmationCode - The confirmation code from the original transaction
 * @param {number} amount - Amount to refund
 * @param {string} username - Username initiating the refund
 * @param {string} remarks - Reason for refund
 */
exports.refundTransaction = async (confirmationCode, amount, username, remarks = 'Refund') => {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${PESAPAL_BASE_URL}/api/Transactions/RefundRequest`,
      {
        confirmation_code: confirmationCode,
        amount: parseFloat(amount),
        username: username,
        remarks: remarks
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log(`💰 Refund initiated for ${confirmationCode}`);
    return response.data;
  } catch (err) {
    console.error('Error processing refund:', err.response?.data || err.message);
    throw err;
  }
};

module.exports = exports;