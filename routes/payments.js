// -----------------------------------
// routes/payments.js - Payment processing with Pesapal
// -----------------------------------
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/callback', paymentController.pesapalCallback);
router.get('/ipn', paymentController.pesapalIPN);

// All other payment routes require authentication
router.use(authenticateToken);

// Payment methods (cards, mobile money saved for future use)
router.get('/methods', paymentController.getPaymentMethods);
router.post('/methods', paymentController.addPaymentMethod);
router.delete('/methods/:methodId', paymentController.removePaymentMethod);

// Payment processing with Pesapal
router.post('/initiate', paymentController.initiatePayment);
router.post('/check-status', paymentController.checkPaymentStatus);

// Transaction history
router.get('/transactions', paymentController.getTransactions);
router.get('/transactions/:transactionId', paymentController.getTransactionDetails);

// Refunds
router.post('/refund', paymentController.requestRefund);
router.get('/refunds', paymentController.getRefunds);

// Wallet operations
router.get('/wallet/balance', paymentController.getWalletBalance);
router.post('/wallet/topup', paymentController.topupWallet);
router.post('/wallet/withdraw', paymentController.withdrawFromWallet);
router.get('/wallet/history', paymentController.getWalletHistory);

module.exports = router;