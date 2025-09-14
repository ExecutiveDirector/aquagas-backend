// -----------------------------------
// routes/vendors.js - Vendor management (UPDATED)
// -----------------------------------
const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireVendorRole } = require('../middleware/authMiddleware');

// ------------------------
// Public vendor information
// ------------------------
router.get('/', vendorController.getVendors);
router.get('/:vendorId', vendorController.getVendorDetails);
router.get('/:vendorId/products', vendorController.getVendorProducts);
router.get('/:vendorId/reviews', vendorController.getVendorReviews);

// REMOVED: Duplicate vendor authentication endpoints
// These are now handled in routes/auth.js:
// - POST /auth/register/vendor
// - POST /auth/login (handles all roles)

// ------------------------
// Protected vendor routes
// ------------------------
router.use(authenticateToken);
router.use(requireVendorRole);

// Vendor dashboard
router.get('/dashboard/stats', vendorController.getDashboardStats);
router.get('/dashboard/recent-orders', vendorController.getRecentOrders);

// Inventory management
router.get('/inventory', vendorController.getInventory);
router.put('/inventory/:productId', vendorController.updateInventory);
router.post('/inventory/movement', vendorController.recordInventoryMovement);
router.get('/inventory/alerts', vendorController.getLowStockAlerts);

// Order management for vendors
router.get('/orders', vendorController.getVendorOrders);
router.put('/orders/:orderId/status', vendorController.updateOrderStatus);
router.get('/orders/:orderId', vendorController.getVendorOrderDetails);

// Vendor analytics
router.get('/analytics/sales', vendorController.getSalesAnalytics);
router.get('/analytics/products', vendorController.getProductAnalytics);

// Outlet management (for multi-location vendors)
router.get('/outlets', vendorController.getOutlets);
router.post('/outlets', vendorController.createOutlet);
router.put('/outlets/:outletId', vendorController.updateOutlet);

module.exports = router;