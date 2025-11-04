// ============================================================================
// routes/vendors.js 
// ============================================================================

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticateToken, requireVendorRole } = require('../middleware/authMiddleware');

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

// Get all vendors
router.get('/', vendorController.getVendors);

// Get vendor details
router.get('/:vendorId', vendorController.getVendorDetails);

// Get vendor products
router.get('/:vendorId/products', vendorController.getVendorProducts);

// Get vendor reviews
router.get('/:vendorId/reviews', vendorController.getVendorReviews);

// ============================================================================
// PROTECTED ROUTES (Require vendor authentication)
// Apply authentication middleware to all routes below
// ============================================================================

router.use(authenticateToken);
router.use(requireVendorRole);

// --------------------------
// Dashboard & Analytics
// --------------------------
router.get('/dashboard/stats', vendorController.getDashboardStats);
router.get('/dashboard/recent-orders', vendorController.getRecentOrders);

router.get('/analytics/sales', vendorController.getSalesAnalytics);
router.get('/analytics/products', vendorController.getProductAnalytics);

// --------------------------
// Product Management
// --------------------------
router.get('/products', vendorController.getVendorProducts);
router.post('/products', vendorController.createProduct);
router.delete('/products/:productId', vendorController.deleteProduct);
router.get('/product_categories', vendorController.getProductCategories);

// Image upload (configure multer middleware as needed)
router.post('/upload-image', vendorController.uploadProductImage);

// --------------------------
// Order Management
// --------------------------
router.get('/orders', vendorController.getVendorOrders);
router.get('/orders/:orderId', vendorController.getVendorOrderDetails);
router.put('/orders/:orderId/status', vendorController.updateOrderStatus);

// --------------------------
// Inventory Management
// --------------------------
router.get('/inventory', vendorController.getInventory);
router.put('/inventory/:inventoryId', vendorController.updateInventory);
router.get('/inventory/alerts', vendorController.getLowStockAlerts);
router.get('/inventory/low-stock', vendorController.getLowStockAlerts);

// --------------------------
// Outlet Management
// --------------------------
router.get('/outlets', vendorController.getOutlets);
router.post('/outlets', vendorController.createOutlet);
router.put('/outlets/:outletId', vendorController.updateOutlet);

module.exports = router;

// // Public routes
// GET  /api/vendors                    - List all vendors
// GET  /api/vendors/:vendorId          - Vendor details
// GET  /api/vendors/:vendorId/products - Vendor products
// GET  /api/vendors/:vendorId/reviews  - Vendor reviews

// // Protected routes (require vendor auth)
// GET  /api/vendors/dashboard/stats    - Dashboard statistics
// GET  /api/vendors/orders             - Vendor orders
// PUT  /api/vendors/orders/:id/status  - Update order status
// GET  /api/vendors/inventory          - Inventory list
// POST /api/vendors/products           - Create product
// ... and more