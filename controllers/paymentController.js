// controllers/paymentController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const axios = require('axios');
const crypto = require('crypto');
const models = initModels(sequelize);

// Pesapal Configuration
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const PESAPAL_API_URL = process.env.PESAPAL_ENV === 'production' 
  ? 'https://pay.pesapal.com/v3' 
  : 'https://cybqa.pesapal.com/pesapalv3';
const PESAPAL_CALLBACK_URL = process.env.PESAPAL_CALLBACK_URL || 'https://yourdomain.com/api/payments/callback';
const PESAPAL_IPN_URL = process.env.PESAPAL_IPN_URL || 'https://yourdomain.com/api/payments/ipn';

let pesapalToken = null;
let tokenExpiry = null;

// --------------------------
// Pesapal Authentication
// --------------------------
const getPesapalToken = async () => {
  if (pesapalToken && tokenExpiry && new Date() < tokenExpiry) {
    return pesapalToken;
  }

  try {
    const response = await axios.post(
      `${PESAPAL_API_URL}/api/Auth/RequestToken`,
      {
        consumer_key: PESAPAL_CONSUMER_KEY,
        consumer_secret: PESAPAL_CONSUMER_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    pesapalToken = response.data.token;
    tokenExpiry = new Date(response.data.expiryDate);
    return pesapalToken;
  } catch (error) {
    console.error('Error getting Pesapal token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Pesapal');
  }
};

// Register IPN URL (call this once during app initialization)
const registerIPNUrl = async () => {
  try {
    const token = await getPesapalToken();
    const response = await axios.post(
      `${PESAPAL_API_URL}/api/URLSetup/RegisterIPN`,
      {
        url: PESAPAL_IPN_URL,
        ipn_notification_type: 'GET'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('IPN URL registered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error registering IPN URL:', error.response?.data || error.message);
  }
};

// --------------------------
// Payment Methods
// --------------------------
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await models.payment_methods.findAll({
      where: { 
        user_id: req.user.user_id,
        is_active: true
      },
      attributes: { exclude: ['created_at'] }
    });
    res.json(methods);
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    next(err);
  }
};

exports.addPaymentMethod = async (req, res, next) => {
  try {
    const { 
      method_type, 
      display_name,
      card_last_four,
      card_brand,
      card_expiry_month,
      card_expiry_year,
      mpesa_phone_number,
      bank_name,
      account_number_masked,
      is_default 
    } = req.body;

    // Validate required fields based on method type
    if (!['mpesa', 'card', 'bank_account', 'wallet'].includes(method_type)) {
      return res.status(400).json({ error: 'Invalid payment method type' });
    }

    // If setting as default, unset other default methods
    if (is_default) {
      await models.payment_methods.update(
        { is_default: false },
        { where: { user_id: req.user.user_id } }
      );
    }

    const method = await models.payment_methods.create({
      user_id: req.user.user_id,
      method_type,
      display_name,
      card_last_four: method_type === 'card' ? card_last_four : null,
      card_brand: method_type === 'card' ? card_brand : null,
      card_expiry_month: method_type === 'card' ? card_expiry_month : null,
      card_expiry_year: method_type === 'card' ? card_expiry_year : null,
      mpesa_phone_number: method_type === 'mpesa' ? mpesa_phone_number : null,
      bank_name: method_type === 'bank_account' ? bank_name : null,
      account_number_masked: method_type === 'bank_account' ? account_number_masked : null,
      is_default: is_default || false,
      is_active: true
    });

    res.status(201).json({ message: 'Payment method added', method });
  } catch (err) {
    console.error('Error adding payment method:', err);
    next(err);
  }
};

exports.removePaymentMethod = async (req, res, next) => {
  try {
    const method = await models.payment_methods.findOne({
      where: { 
        method_id: req.params.methodId,
        user_id: req.user.user_id
      }
    });
    
    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    await method.update({ is_active: false });
    res.json({ message: 'Payment method removed' });
  } catch (err) {
    console.error('Error removing payment method:', err);
    next(err);
  }
};

// --------------------------
// Pesapal Payment Processing
// --------------------------
exports.initiatePayment = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const { 
      amount, 
      order_id, 
      description,
      payment_method,
      billing_address 
    } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Get user details
    const user = await models.users.findByPk(req.user.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate unique merchant reference
    const merchantReference = `ORD-${order_id || Date.now()}-${user.user_id}`;

    // Get Pesapal token
    const token = await getPesapalToken();

    // Prepare Pesapal payment request
    const pesapalRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: parseFloat(amount),
      description: description || 'Order Payment',
      callback_url: `${PESAPAL_CALLBACK_URL}?merchant_reference=${merchantReference}`,
      notification_id: process.env.PESAPAL_IPN_ID, // From registerIPNUrl
      billing_address: {
        email_address: user.email || req.user.email,
        phone_number: billing_address?.phone_number || user.phone_number,
        country_code: 'KE',
        first_name: user.first_name,
        last_name: user.last_name,
        line_1: billing_address?.line_1 || '',
        line_2: billing_address?.line_2 || '',
        city: billing_address?.city || '',
        state: billing_address?.state || ''
      }
    };

    // Submit order request to Pesapal
    const response = await axios.post(
      `${PESAPAL_API_URL}/api/Transactions/SubmitOrderRequest`,
      pesapalRequest,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status !== '200') {
      throw new Error(response.data.message || 'Failed to initiate payment');
    }

    // Create transaction record
    const transaction = await models.transactions.create({
      user_id: req.user.user_id,
      order_id: order_id,
      amount: amount,
      merchant_reference: merchantReference,
      pesapal_tracking_id: response.data.order_tracking_id,
      payment_method: payment_method || 'pesapal',
      status: 'pending',
      metadata: JSON.stringify({
        redirect_url: response.data.redirect_url,
        pesapal_request: pesapalRequest
      })
    }, { transaction: t });

    await t.commit();

    res.json({
      message: 'Payment initiated',
      transaction_id: transaction.transaction_id,
      merchant_reference: merchantReference,
      redirect_url: response.data.redirect_url,
      order_tracking_id: response.data.order_tracking_id
    });
  } catch (err) {
    await t.rollback();
    console.error('Error initiating payment:', err.response?.data || err.message);
    next(err);
  }
};

exports.checkPaymentStatus = async (req, res, next) => {
  try {
    const { order_tracking_id } = req.body;

    if (!order_tracking_id) {
      return res.status(400).json({ error: 'order_tracking_id is required' });
    }

    const token = await getPesapalToken();

    const response = await axios.get(
      `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${order_tracking_id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    // Update transaction status in database
    const transaction = await models.transactions.findOne({
      where: { pesapal_tracking_id: order_tracking_id }
    });

    if (transaction) {
      const statusMap = {
        '0': 'invalid',
        '1': 'completed',
        '2': 'failed',
        '3': 'reversed'
      };

      transaction.status = statusMap[response.data.payment_status_code] || 'pending';
      transaction.payment_method = response.data.payment_method;
      transaction.metadata = JSON.stringify({
        ...JSON.parse(transaction.metadata || '{}'),
        pesapal_status: response.data
      });
      await transaction.save();
    }

    res.json({
      status: response.data.payment_status_description,
      payment_method: response.data.payment_method,
      amount: response.data.amount,
      transaction_details: response.data
    });
  } catch (err) {
    console.error('Error checking payment status:', err.response?.data || err.message);
    next(err);
  }
};

exports.pesapalCallback = async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query;

    if (!OrderTrackingId) {
      return res.status(400).send('Missing OrderTrackingId');
    }

    // Get transaction status
    const token = await getPesapalToken();
    const response = await axios.get(
      `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    // Update transaction
    const transaction = await models.transactions.findOne({
      where: { pesapal_tracking_id: OrderTrackingId }
    });

    if (transaction) {
      const statusMap = {
        '0': 'invalid',
        '1': 'completed',
        '2': 'failed',
        '3': 'reversed'
      };
      
      transaction.status = statusMap[response.data.payment_status_code] || 'pending';
      transaction.payment_method = response.data.payment_method;
      await transaction.save();

      // If payment successful, update wallet
      if (transaction.status === 'completed' && transaction.reference_type === 'topup') {
        await updateWalletBalance(transaction.user_id, transaction.amount, 'credit', 'topup', transaction.transaction_id);
      }
    }

    // Redirect to frontend with status
    const frontendUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';
    res.redirect(`${frontendUrl}/payment/status?status=${response.data.payment_status_description}&reference=${OrderMerchantReference}`);
  } catch (err) {
    console.error('Error in Pesapal callback:', err);
    res.status(500).send('Error processing payment callback');
  }
};

exports.pesapalIPN = async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

    if (!OrderTrackingId) {
      return res.status(200).send('Missing OrderTrackingId');
    }

    // Get transaction status
    const token = await getPesapalToken();
    const response = await axios.get(
      `${PESAPAL_API_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${OrderTrackingId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );

    // Update transaction
    const transaction = await models.transactions.findOne({
      where: { pesapal_tracking_id: OrderTrackingId }
    });

    if (transaction) {
      const statusMap = {
        '0': 'invalid',
        '1': 'completed',
        '2': 'failed',
        '3': 'reversed'
      };
      
      transaction.status = statusMap[response.data.payment_status_code] || 'pending';
      transaction.payment_method = response.data.payment_method;
      await transaction.save();

      console.log(`IPN received for ${OrderTrackingId}: ${transaction.status}`);
    }

    res.status(200).send('IPN received');
  } catch (err) {
    console.error('Error in Pesapal IPN:', err);
    res.status(200).send('IPN error'); // Always return 200 for IPN
  }
};

// --------------------------
// Transaction History
// --------------------------
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.user_id };
    if (status) where.status = status;
    if (type) where.transaction_type = type;

    const { count, rows } = await models.transactions.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    next(err);
  }
};

exports.getTransactionDetails = async (req, res, next) => {
  try {
    const transaction = await models.transactions.findOne({
      where: { 
        transaction_id: req.params.transactionId,
        user_id: req.user.user_id
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (err) {
    console.error('Error fetching transaction details:', err);
    next(err);
  }
};

// --------------------------
// Refunds
// --------------------------
exports.requestRefund = async (req, res, next) => {
  try {
    const { transaction_id, reason } = req.body;
    
    const transaction = await models.transactions.findOne({
      where: { 
        transaction_id,
        user_id: req.user.user_id
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }

    const refund = await models.refunds.create({
      user_id: req.user.user_id,
      transaction_id,
      amount: transaction.amount,
      reason,
      status: 'pending'
    });

    res.status(201).json({ message: 'Refund requested', refund });
  } catch (err) {
    console.error('Error requesting refund:', err);
    next(err);
  }
};

exports.getRefunds = async (req, res, next) => {
  try {
    const refunds = await models.refunds.findAll({
      where: { user_id: req.user.user_id },
      order: [['created_at', 'DESC']],
      include: [{
        model: models.transactions,
        attributes: ['transaction_id', 'amount', 'merchant_reference']
      }]
    });
    
    res.json(refunds);
  } catch (err) {
    console.error('Error fetching refunds:', err);
    next(err);
  }
};

// --------------------------
// Wallet Operations Helper
// --------------------------
const updateWalletBalance = async (userId, amount, transactionType, referenceType, referenceId, description = null) => {
  const t = await sequelize.transaction();
  
  try {
    // Get or create wallet
    let wallet = await models.user_wallets.findOne({
      where: { user_id: userId },
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!wallet) {
      wallet = await models.user_wallets.create({
        user_id: userId,
        balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_spent: 0
      }, { transaction: t });
    }

    const previousBalance = parseFloat(wallet.balance);
    let newBalance = previousBalance;

    // Update balance based on transaction type
    switch (transactionType) {
      case 'credit':
        newBalance = previousBalance + parseFloat(amount);
        wallet.balance = newBalance;
        wallet.total_earned = parseFloat(wallet.total_earned) + parseFloat(amount);
        break;
      case 'debit':
        if (previousBalance < parseFloat(amount)) {
          throw new Error('Insufficient balance');
        }
        newBalance = previousBalance - parseFloat(amount);
        wallet.balance = newBalance;
        wallet.total_spent = parseFloat(wallet.total_spent) + parseFloat(amount);
        break;
      case 'hold':
        if (previousBalance < parseFloat(amount)) {
          throw new Error('Insufficient balance');
        }
        wallet.balance = previousBalance - parseFloat(amount);
        wallet.pending_balance = parseFloat(wallet.pending_balance) + parseFloat(amount);
        newBalance = wallet.balance;
        break;
      case 'release':
        wallet.pending_balance = parseFloat(wallet.pending_balance) - parseFloat(amount);
        wallet.balance = previousBalance + parseFloat(amount);
        newBalance = wallet.balance;
        break;
    }

    await wallet.save({ transaction: t });

    // Create wallet transaction record
    await models.wallet_transactions.create({
      wallet_id: wallet.wallet_id,
      transaction_type: transactionType,
      amount: parseFloat(amount),
      previous_balance: previousBalance,
      new_balance: newBalance,
      reference_type: referenceType,
      reference_id: referenceId,
      description: description
    }, { transaction: t });

    await t.commit();
    return wallet;
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// --------------------------
// Wallet Endpoints
// --------------------------
exports.getWalletBalance = async (req, res, next) => {
  try {
    let wallet = await models.user_wallets.findOne({
      where: { user_id: req.user.user_id }
    });

    if (!wallet) {
      wallet = await models.user_wallets.create({
        user_id: req.user.user_id,
        balance: 0,
        pending_balance: 0,
        total_earned: 0,
        total_spent: 0
      });
    }

    res.json(wallet);
  } catch (err) {
    console.error('Error fetching wallet balance:', err);
    next(err);
  }
};

exports.topupWallet = async (req, res, next) => {
  try {
    const { amount, payment_method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Initiate Pesapal payment for wallet topup
    const token = await getPesapalToken();
    const user = await models.users.findByPk(req.user.user_id);
    const merchantReference = `TOPUP-${Date.now()}-${user.user_id}`;

    const pesapalRequest = {
      id: merchantReference,
      currency: 'KES',
      amount: parseFloat(amount),
      description: 'Wallet Top-up',
      callback_url: `${PESAPAL_CALLBACK_URL}?merchant_reference=${merchantReference}`,
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: {
        email_address: user.email || req.user.email,
        phone_number: user.phone_number,
        country_code: 'KE',
        first_name: user.first_name,
        last_name: user.last_name
      }
    };

    const response = await axios.post(
      `${PESAPAL_API_URL}/api/Transactions/SubmitOrderRequest`,
      pesapalRequest,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Create transaction record
    await models.transactions.create({
      user_id: req.user.user_id,
      amount: amount,
      merchant_reference: merchantReference,
      pesapal_tracking_id: response.data.order_tracking_id,
      payment_method: payment_method || 'pesapal',
      reference_type: 'topup',
      status: 'pending',
      metadata: JSON.stringify({ redirect_url: response.data.redirect_url })
    });

    res.json({
      message: 'Wallet topup initiated',
      redirect_url: response.data.redirect_url,
      order_tracking_id: response.data.order_tracking_id
    });
  } catch (err) {
    console.error('Error topping up wallet:', err);
    next(err);
  }
};

exports.withdrawFromWallet = async (req, res, next) => {
  try {
    const { amount, mpesa_phone_number } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!mpesa_phone_number) {
      return res.status(400).json({ error: 'M-Pesa phone number required' });
    }

    // Update wallet and create transaction
    const wallet = await updateWalletBalance(
      req.user.user_id,
      amount,
      'debit',
      'withdrawal',
      null,
      `Withdrawal to ${mpesa_phone_number}`
    );

    // TODO: Integrate with M-Pesa B2C API for actual payout

    res.json({
      message: 'Withdrawal initiated',
      new_balance: wallet.balance
    });
  } catch (err) {
    console.error('Error withdrawing from wallet:', err);
    if (err.message === 'Insufficient balance') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

exports.getWalletHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const wallet = await models.user_wallets.findOne({
      where: { user_id: req.user.user_id }
    });

    if (!wallet) {
      return res.json({ transactions: [], total: 0, page: 1, pages: 0 });
    }

    const { count, rows } = await models.wallet_transactions.findAndCountAll({
      where: { wallet_id: wallet.wallet_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      transactions: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Error fetching wallet history:', err);
    next(err);
  }
};

// Export utility functions for use in other controllers
module.exports.updateWalletBalance = updateWalletBalance;
module.exports.registerIPNUrl = registerIPNUrl;