// ============================================
// routes/orders.js - FIXED & ALIGNED
// ============================================

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Import authentication middleware
const { 
  authenticateToken, 
  optionalAuth, 
  requireUserRole,
  requireAdminOrVendorRole
} = require('../middleware/auth');

// =========================================================================
// PUBLIC/GUEST ROUTES
// =========================================================================

/**
 * @route   POST /api/v1/orders/draft
 * @desc    Create new draft order (MATCHES Flutter createDraftOrder)
 * @access  Public/Authenticated
 * @body    { 
 *   user_id, outlet_id, items, total_price, 
 *   customer_email, customer_phone, 
 *   delivery_latitude, delivery_longitude, 
 *   delivery_address, delivery_notes, 
 *   is_guest 
 * }
 * @note    ✅ NEW - Matches Flutter's createDraftOrder endpoint
 */
router.post('/draft', optionalAuth, orderController.createDraftOrder);

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order (standard - backward compatibility)
 * @access  Public/Authenticated
 * @body    { user_id, outlet_id, items, total_price, ... }
 * @note    Order created in DRAFT status, ready for payment
 */
router.post('/', optionalAuth, orderController.createOrder);

// =========================================================================
// AUTHENTICATED USER ROUTES
// =========================================================================

/**
 * @route   POST /api/v1/orders/:orderId/confirm
 * @desc    Confirm draft order after payment initiation
 * @access  Private (Owner/Admin)
 * @body    { 
 *   payment_tracking_id: string (optional),
 *   payment_method: string (optional),
 *   phone_number: string (optional),
 *   email: string (optional)
 * }
 * @note    Moves order from DRAFT to PENDING status
 */
router.post('/:orderId/confirm', optionalAuth, orderController.confirmOrder);

/**
 * @route   POST /api/v1/orders/:orderId/cancel-draft
 * @desc    Cancel draft order (if payment failed/cancelled)
 * @access  Private (Owner/Admin)
 * @body    { cancellation_reason: string (optional) }
 * @note    Only works for orders in DRAFT status
 */
router.post('/:orderId/cancel-draft', optionalAuth, orderController.cancelDraftOrder);

/**
 * @route   PUT /api/v1/orders/:orderId/payment-status
 * @desc    Update payment status (usually called by payment webhooks)
 * @access  Private (Admin/System)
 * @body    {
 *   payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'failed',
 *   transaction_id: string (optional),
 *   payment_reference: string (optional)
 * }
 * @note    ✅ FIXED - Now properly exported and implemented
 *          Auto-confirms order if payment_status = 'paid' and order is in DRAFT
 */
router.put('/:orderId/payment-status', optionalAuth, orderController.updatePaymentStatus);

/**
 * @route   GET /api/v1/orders/user
 * @desc    Get current user's order history
 * @access  Private (User only)
 * @query   { status, limit, offset }
 */
router.get('/user', authenticateToken, requireUserRole, orderController.getUserOrders);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get detailed order information by ID
 * @access  Private (Owner/Admin/Vendor/Rider)
 */
router.get('/:orderId', optionalAuth, orderController.getOrderById);

/**
 * @route   PUT /api/v1/orders/:orderId
 * @desc    Update order with payment and delivery details
 * @access  Private (Owner/Admin/Vendor)
 * @body    {
 *   payment_method, delivery_fee, delivery_type,
 *   delivery_latitude, delivery_longitude, delivery_address,
 *   phone_number, status, notes
 * }
 * @note    ✅ ADDED - Matches Flutter's updateOrder method
 */
router.put('/:orderId', authenticateToken, orderController.updateOrder);

/**
 * @route   PUT /api/v1/orders/:orderId/status
 * @desc    Update order status (for vendors/riders/admin)
 * @access  Private (Admin/Vendor only)
 * @body    { order_status: string }
 */
router.put(
  '/:orderId/status', 
  authenticateToken, 
  requireAdminOrVendorRole, 
  orderController.updateOrderStatus
);

/**
 * @route   PUT /api/v1/orders/:orderId/cancel
 * @desc    Cancel an order (user or admin)
 * @access  Private (Owner/Admin)
 * @body    { cancellation_reason: string (optional) }
 */
router.put('/:orderId/cancel', authenticateToken, orderController.cancelOrder);

// =========================================================================
// ADMIN/VENDOR ROUTES
// =========================================================================

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (admin/vendor view)
 * @access  Private (Admin/Vendor only)
 * @query   { status, vendor_id, limit, offset }
 * @note    ✅ FIXED - Now properly implemented
 */
router.get('/', authenticateToken, requireAdminOrVendorRole, orderController.getAllOrders);

/**
 * @route   PUT /api/v1/orders/:orderId/assign-rider
 * @desc    Manually assign rider to order
 * @access  Private (Admin/Vendor only)
 * @body    { rider_id: number }
 * @note    ✅ FIXED - Now properly implemented
 */
router.put(
  '/:orderId/assign-rider',
  authenticateToken,
  requireAdminOrVendorRole,
  orderController.assignRider
);

module.exports = router;