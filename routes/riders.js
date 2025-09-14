const express = require('express');
const router = express.Router();
const riderController = require('../controllers/riderController');
const { authenticateToken, requireAdminRole } = require('../middleware/authMiddleware');

// Debug log to verify imports
console.log('riderController:', riderController);
console.log('Middleware:', { authenticateToken, requireAdminRole });

// Rider Routes
router.post('/login', riderController.riderLogin);
router.post('/register', riderController.riderRegister);
router.get('/assignments', authenticateToken, riderController.getAssignments);
router.get('/profile', authenticateToken, riderController.getRiderProfile);
router.put('/profile', authenticateToken, riderController.updateRiderProfile);
router.put('/status', authenticateToken, riderController.updateRiderStatus);
router.get('/earnings', authenticateToken, riderController.getEarnings);
router.post('/location', authenticateToken, riderController.updateLocation);
router.get('/orders/available', authenticateToken, riderController.getAvailableOrders);
router.post('/orders/:orderId/accept', authenticateToken, riderController.acceptOrder);
router.post('/orders/:orderId/decline', authenticateToken, riderController.declineOrder);
router.post('/orders/:orderId/pickup', authenticateToken, riderController.confirmPickup);
router.post('/orders/:orderId/deliver', authenticateToken, riderController.confirmDelivery);
router.post('/orders/:orderId/photo', authenticateToken, riderController.uploadDeliveryPhoto);
router.get('/analytics', authenticateToken, riderController.getRiderAnalytics);
router.get('/ratings', authenticateToken, riderController.getRatings);
router.get('/route', authenticateToken, riderController.getOptimizedRoute);

// Admin Routes
router.get('/', requireAdminRole, riderController.getRiders); // Line 26 (fixed)
router.post('/', requireAdminRole, riderController.createRider);
router.put('/:riderId/approve', requireAdminRole, riderController.approveRider);
router.put('/:riderId/status', requireAdminRole, riderController.updateRiderStatus);
router.post('/:riderId/reset-password', requireAdminRole, riderController.resetRiderPassword);

module.exports = router;