// // routes/orders.js - Order management routes
// const express = require('express');
// const router = express.Router();
// const orderController = require('../controllers/orderController');

// // --- DIAGNOSTIC LOG ---
// // This will print the contents of the imported controller to your console.
// // If it's empty or missing functions, we'll know the import is the problem.
// //console.log('--- Imported orderController: ---');
// //console.log(orderController);
// //console.log('---------------------------------;')

// const { authenticateToken } = require('../middleware/authMiddleware');
// // Assuming validation file exists, if not, you can comment this out.
//  const { validateOrderCreation } = require('../utils/validation');

// // All order routes require authentication
// router.use(authenticateToken);

// // Order lifecycle
// // The 'validateOrderCreation' middleware is included. If you don't have this file, remove it from the line below.
// router.post('/',  validateOrderCreation,  orderController.createOrder); // This corresponds to line 15 in a typical editor
// router.get('/', orderController.getUserOrders);
// router.get('/:orderId', orderController.getOrderDetails);
// router.put('/:orderId/cancel', orderController.cancelOrder);

// // Order tracking
// router.get('/:orderId/track', orderController.trackOrder);
// router.get('/:orderId/timeline', orderController.getOrderTimeline);

// // Order modifications (before confirmation)
// router.put('/:orderId/items', orderController.updateOrderItems);
// router.put('/:orderId/address', orderController.updateDeliveryAddress);

// // Order feedback
// router.post('/:orderId/review', orderController.submitOrderReview);
// router.post('/:orderId/rate-rider', orderController.rateRider);

// // Repeat orders
// router.post('/:orderId/repeat', orderController.repeatOrder);

// // Delivery scheduling
// router.get('/:orderId/delivery-slots', orderController.getDeliverySlots);
// router.put('/:orderId/delivery-slot', orderController.updateDeliverySlot);


// module.exports = router;


// routes/orders.js
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
// PUBLIC ROUTES (Guest + Authenticated)
// =========================================================================

/**
 * @route   POST /api/v1/orders
 * @desc    Create new order (guest or authenticated user)
 * @access  Public/Authenticated
 * @body    {
 *   user_id: string (required for auth, "guest" for guests),
 *   outlet_id: string (required),
 *   vendor_id: string (optional),
 *   items: [{product_id, product_name, quantity, unit_price}] (required),
 *   total_price: number (required),
 *   phone_number: string (optional),
 *   notes: string (optional),
 *   delivery_notes: string (optional),
 *   delivery_address: string (optional),
 *   delivery_latitude: number (optional),
 *   delivery_longitude: number (optional),
 *   scheduled_date: string (optional, format: YYYY-MM-DD),
 *   scheduled_time: string (optional, format: HH:mm),
 *   payment_method: string (optional),
 *   coupon_code: string (optional),
 *   is_guest: boolean (optional, default: false)
 * }
 */
router.post('/', optionalAuth, orderController.createOrder);

// =========================================================================
// AUTHENTICATED USER ROUTES
// =========================================================================

/**
 * @route   GET /api/v1/orders/user
 * @desc    Get current user's order history
 * @access  Private (User only)
 * @query   {
 *   status: string (optional, filter by order_status),
 *   limit: number (optional, default: 50),
 *   offset: number (optional, default: 0)
 * }
 */
router.get('/user', authenticateToken, requireUserRole, orderController.getUserOrders);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get detailed order information by ID
 * @access  Private (Owner/Admin/Vendor/Rider)
 * @note    Authorization checked in controller based on user role
 */
router.get('/:orderId', authenticateToken, orderController.getOrderById);

/**
 * @route   PUT /api/v1/orders/:orderId/status
 * @desc    Update order status (for vendors/riders/admin)
 * @access  Private (Admin/Vendor only)
 * @body    {
 *   order_status: string (required, one of: pending, confirmed, preparing, 
 *                        ready, dispatched, delivered, canceled, refunded)
 * }
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
 * @body    {
 *   cancellation_reason: string (optional)
 * }
 */
router.put('/:orderId/cancel', authenticateToken, orderController.cancelOrder);

// =========================================================================
// OPTIONAL ADVANCED ROUTES (Uncomment when implemented)
// =========================================================================

/**
 * @route   GET /api/v1/orders/:orderId/track
 * @desc    Track order in real-time (get rider location and status)
 * @access  Private (Owner)
 */
// router.get('/:orderId/track', authenticateToken, requireUserRole, orderController.trackOrder);

/**
 * @route   GET /api/v1/orders/:orderId/timeline
 * @desc    Get order status timeline with timestamps
 * @access  Private (Owner)
 */
// router.get('/:orderId/timeline', authenticateToken, requireUserRole, orderController.getOrderTimeline);

/**
 * @route   POST /api/v1/orders/:orderId/repeat
 * @desc    Repeat/reorder a previous order
 * @access  Private (Owner)
 */
// router.post('/:orderId/repeat', authenticateToken, requireUserRole, orderController.repeatOrder);

/**
 * @route   POST /api/v1/orders/:orderId/review
 * @desc    Submit order review and rating
 * @access  Private (Owner)
 * @body    {
 *   overall_rating: number (required, 1-5),
 *   comment: string (optional)
 * }
 */
// router.post('/:orderId/review', authenticateToken, requireUserRole, orderController.submitOrderReview);

/**
 * @route   POST /api/v1/orders/:orderId/rate-rider
 * @desc    Rate the delivery rider
 * @access  Private (Owner)
 * @body    {
 *   overall_rating: number (required, 1-5)
 * }
 */
// router.post('/:orderId/rate-rider', authenticateToken, requireUserRole, orderController.rateRider);

module.exports = router;