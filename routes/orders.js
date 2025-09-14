// routes/orders.js - Order management routes
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// --- DIAGNOSTIC LOG ---
// This will print the contents of the imported controller to your console.
// If it's empty or missing functions, we'll know the import is the problem.
//console.log('--- Imported orderController: ---');
//console.log(orderController);
//console.log('---------------------------------;')

const { authenticateToken } = require('../middleware/authMiddleware');
// Assuming validation file exists, if not, you can comment this out.
 const { validateOrderCreation } = require('../utils/validation');

// All order routes require authentication
router.use(authenticateToken);

// Order lifecycle
// The 'validateOrderCreation' middleware is included. If you don't have this file, remove it from the line below.
router.post('/',  validateOrderCreation,  orderController.createOrder); // This corresponds to line 15 in a typical editor
router.get('/', orderController.getUserOrders);
router.get('/:orderId', orderController.getOrderDetails);
router.put('/:orderId/cancel', orderController.cancelOrder);

// Order tracking
router.get('/:orderId/track', orderController.trackOrder);
router.get('/:orderId/timeline', orderController.getOrderTimeline);

// Order modifications (before confirmation)
router.put('/:orderId/items', orderController.updateOrderItems);
router.put('/:orderId/address', orderController.updateDeliveryAddress);

// Order feedback
router.post('/:orderId/review', orderController.submitOrderReview);
router.post('/:orderId/rate-rider', orderController.rateRider);

// Repeat orders
router.post('/:orderId/repeat', orderController.repeatOrder);

// Delivery scheduling
router.get('/:orderId/delivery-slots', orderController.getDeliverySlots);
router.put('/:orderId/delivery-slot', orderController.updateDeliverySlot);


module.exports = router;
