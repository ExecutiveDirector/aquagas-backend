// controllers/paymentController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// --------------------------
// Payment Methods
// --------------------------
exports.getPaymentMethods = async (req, res, next) => {
  try {
    const methods = await models.payment_methods.findAll({
      where: { user_id: req.user.user_id },
    });
    res.json(methods);
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    next(err);
  }
};

exports.addPaymentMethod = async (req, res, next) => {
  try {
    const { type, details } = req.body; // e.g., type: 'card', details: JSON
    const method = await models.payment_methods.create({
      user_id: req.user.user_id,
      type,
      details,
      created_at: new Date(),
    });
    res.status(201).json({ message: 'Payment method added', method });
  } catch (err) {
    console.error('Error adding payment method:', err);
    next(err);
  }
};

exports.removePaymentMethod = async (req, res, next) => {
  try {
    const method = await models.payment_methods.findByPk(req.params.methodId);
    if (!method) return res.status(404).json({ error: 'Payment method not found' });

    await method.destroy();
    res.json({ message: 'Payment method removed' });
  } catch (err) {
    console.error('Error removing payment method:', err);
    next(err);
  }
};

// --------------------------
// Payment Processing
// --------------------------
exports.processPayment = async (req, res, next) => {
  try {
    const { amount, methodId, orderId } = req.body;
    // TODO: Implement actual payment logic (e.g., Stripe, PayPal)
    const transaction = await models.transactions.create({
      user_id: req.user.user_id,
      amount,
      method_id: methodId,
      order_id: orderId,
      status: 'completed', // default for now
      created_at: new Date(),
    });
    res.json({ message: 'Payment processed', transaction });
  } catch (err) {
    console.error('Error processing payment:', err);
    next(err);
  }
};

// --------------------------
// M-Pesa Integration
// --------------------------
exports.initiateMpesaPayment = async (req, res, next) => {
  try {
    const { phone_number, amount } = req.body;
    // TODO: Integrate Safaricom M-Pesa STK Push API here
    res.json({ message: 'M-Pesa STK Push initiated', phone_number, amount });
  } catch (err) {
    console.error('Error initiating M-Pesa payment:', err);
    next(err);
  }
};

exports.mpesaCallback = async (req, res, next) => {
  try {
    const callbackData = req.body;
    // TODO: Handle M-Pesa callback, update transactions
    res.json({ message: 'M-Pesa callback received', callbackData });
  } catch (err) {
    console.error('Error handling M-Pesa callback:', err);
    next(err);
  }
};

// --------------------------
// Transaction History
// --------------------------
exports.getTransactions = async (req, res, next) => {
  try {
    const transactions = await models.transactions.findAll({
      where: { user_id: req.user.user_id },
      order: [['created_at', 'DESC']],
    });
    res.json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    next(err);
  }
};

exports.getTransactionDetails = async (req, res, next) => {
  try {
    const transaction = await models.transactions.findByPk(req.params.transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
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
    const { transactionId, reason } = req.body;
    const transaction = await models.transactions.findByPk(transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    const refund = await models.refunds.create({
      user_id: req.user.user_id,
      transaction_id: transactionId,
      reason,
      status: 'pending',
      created_at: new Date(),
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
    });
    res.json(refunds);
  } catch (err) {
    console.error('Error fetching refunds:', err);
    next(err);
  }
};

// --------------------------
// Wallet Operations
// --------------------------
exports.topupWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const wallet = await models.wallets.findOne({ where: { user_id: req.user.user_id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    wallet.balance += amount;
    await wallet.save();

    await models.transactions.create({
      user_id: req.user.user_id,
      amount,
      type: 'topup',
      status: 'completed',
      created_at: new Date(),
    });

    res.json({ message: 'Wallet topped up', balance: wallet.balance });
  } catch (err) {
    console.error('Error topping up wallet:', err);
    next(err);
  }
};

exports.withdrawFromWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const wallet = await models.wallets.findOne({ where: { user_id: req.user.user_id } });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    wallet.balance -= amount;
    await wallet.save();

    await models.transactions.create({
      user_id: req.user.user_id,
      amount,
      type: 'withdraw',
      status: 'completed',
      created_at: new Date(),
    });

    res.json({ message: 'Wallet withdrawal successful', balance: wallet.balance });
  } catch (err) {
    console.error('Error withdrawing from wallet:', err);
    next(err);
  }
};

// At the end of paymentController.js
