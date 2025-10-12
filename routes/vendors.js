// ============================================================================
//  Group protected routes 
// ============================================================================

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireVendorRole } = require('../middleware/authMiddleware');

// Public vendor routes
router.get('/', vendorController.getVendors);
router.get('/:vendorId', vendorController.getVendorDetails);
router.get('/:vendorId/products', vendorController.getVendorProducts);
router.get('/:vendorId/reviews', vendorController.getVendorReviews);

// Create protected router
const protectedRouter = express.Router();
protectedRouter.use(authenticateToken);
protectedRouter.use(requireVendorRole);

// Vendor dashboard
protectedRouter.get('/dashboard/stats', vendorController.getDashboardStats);
protectedRouter.get('/dashboard/recent-orders', vendorController.getRecentOrders);

// Inventory management
protectedRouter.get('/inventory', vendorController.getInventory);
protectedRouter.put('/inventory/:inventoryId', vendorController.updateInventory);
protectedRouter.get('/inventory/alerts', vendorController.getLowStockAlerts);

// Order management
protectedRouter.get('/orders', vendorController.getVendorOrders);
protectedRouter.put('/orders/:orderId/status', vendorController.updateOrderStatus);
protectedRouter.get('/orders/:orderId', vendorController.getVendorOrderDetails);

// Analytics
protectedRouter.get('/analytics/sales', vendorController.getSalesAnalytics);
protectedRouter.get('/analytics/products', vendorController.getProductAnalytics);

// Outlets
protectedRouter.get('/outlets', vendorController.getOutlets);
protectedRouter.post('/outlets', vendorController.createOutlet);
protectedRouter.put('/outlets/:outletId', vendorController.updateOutlet);

// Mount protected routes
router.use('/', protectedRouter);

module.exports = router;
