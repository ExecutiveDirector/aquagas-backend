// -----------------------------------
// routes/analytics.js - Analytics and reporting
// -----------------------------------
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken, requireAdminOrVendorRole } = require('../middleware/authMiddleware');

// All analytics routes require authentication
router.use(authenticateToken);
router.use(requireAdminOrVendorRole);

// General analytics
router.get('/overview', analyticsController.getOverviewStats);
router.get('/sales', analyticsController.getSalesAnalytics);
router.get('/users', analyticsController.getUserAnalytics);
router.get('/orders', analyticsController.getOrderAnalytics);

// Performance metrics
router.get('/delivery-performance', analyticsController.getDeliveryPerformance);
router.get('/rider-performance', analyticsController.getRiderPerformance);
router.get('/vendor-performance', analyticsController.getVendorPerformance);

// Financial reports
router.get('/revenue', analyticsController.getRevenueReports);
router.get('/commissions', analyticsController.getCommissionReports);

// Custom reports
router.post('/reports/generate', analyticsController.generateCustomReport);
router.get('/reports/:reportId', analyticsController.getReport);

module.exports = router;