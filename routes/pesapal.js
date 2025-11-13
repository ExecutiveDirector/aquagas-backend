// ============================================
// routes/pesapal.js - Pesapal payment routes
// ============================================

const express = require('express');
const router = express.Router();
const pesapalController = require('../controllers/pesapalController');

// Import authentication middleware
const { 
  authenticateToken, 
  optionalAuth,
  requireAdminRole
} = require('../middleware/auth');

/**
 * @route   POST /api/v1/payments/pesapal/initiate
 * @desc    Initiate Pesapal payment for an order
 * @access  Public/Authenticated
 * @body    {
 *   order_id: string (required),
 *   callback_url: string (optional),
 *   email: string (required if not in order),
 *   phone: string (required if not in order),
 *   city: string (optional),
 *   state: string (optional)
 * }
 */
router.post('/initiate', optionalAuth, pesapalController.initiatePayment);

/**
 * @route   GET /api/v1/payments/pesapal/callback
 * @desc    Handle Pesapal redirect callback after payment
 * @access  Public
 * @query   {
 *   OrderTrackingId: string,
 *   OrderMerchantReference: string
 * }
 */
router.get('/callback', pesapalController.handleCallback);

/**
 * @route   POST /api/v1/payments/pesapal/ipn
 * @route   GET /api/v1/payments/pesapal/ipn
 * @desc    Handle Pesapal IPN (Instant Payment Notification)
 * @access  Public (called by Pesapal)
 * @body    {
 *   OrderTrackingId: string,
 *   OrderMerchantReference: string
 * }
 */
router.post('/ipn', pesapalController.handleIPN);
router.get('/ipn', pesapalController.handleIPN);

/**
 * @route   GET /api/v1/payments/pesapal/status/:orderTrackingId
 * @desc    Check payment status
 * @access  Private
 */
router.get('/status/:orderTrackingId', authenticateToken, pesapalController.checkPaymentStatus);

/**
 * @route   POST /api/v1/payments/pesapal/register-ipn
 * @desc    Register IPN URL with Pesapal (Admin only)
 * @access  Private (Admin)
 * @body    {
 *   ipn_url: string (required),
 *   notification_type: string (optional, default: 'GET')
 * }
 */
router.post('/register-ipn', authenticateToken, requireAdminRole, pesapalController.registerIPN);

module.exports = router;