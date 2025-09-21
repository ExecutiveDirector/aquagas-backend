// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdminRole } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdminRole);

// Dashboard overview
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.put('/users/:userId/status', adminController.updateUserStatus);

// Order management
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:orderId/status', adminController.updateOrderStatus);

// Rider management
router.get('/riders', adminController.getAllRiders);
router.post('/riders', adminController.createRider);
router.put('/riders/:riderId/approve', adminController.approveRider);  // Fixed pattern
router.put('/riders/:riderId/status', adminController.updateRiderStatus);

// Vendor management
router.get('/vendors', adminController.getAllVendors);
router.put('/vendors/:vendorId/approve', adminController.approveVendor);  // Fixed pattern
router.put('/vendors/:vendorId/status', adminController.updateVendorStatus);

// Product management
router.post('/products', adminController.createProduct);
router.put('/products/:productId', adminController.updateProduct);
router.delete('/products/:productId', adminController.deleteProduct);

// System settings
router.get('/system/settings', adminController.getSystemSettings);  // Fixed path
router.put('/system/settings', adminController.updateSystemSettings);  // Fixed path

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;