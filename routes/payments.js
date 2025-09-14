

// -----------------------------------
// routes/payments.js - Payment processing
// -----------------------------------
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All payment routes require authentication
router.use(authenticateToken);

// Payment methods
router.get('/methods', paymentController.getPaymentMethods);
router.post('/methods', paymentController.addPaymentMethod);
router.delete('/methods/:methodId', paymentController.removePaymentMethod);

// Payment processing
router.post('/process', paymentController.processPayment);
router.post('/mpesa/stk-push', paymentController.initiateMpesaPayment);
router.post('/mpesa/callback', paymentController.mpesaCallback);

// Transaction history
router.get('/transactions', paymentController.getTransactions);
router.get('/transactions/:transactionId', paymentController.getTransactionDetails);

// Refunds
router.post('/refund', paymentController.requestRefund);
router.get('/refunds', paymentController.getRefunds);

// Wallet operations
router.post('/wallet/topup', paymentController.topupWallet);
router.post('/wallet/withdraw', paymentController.withdrawFromWallet);

module.exports = router;