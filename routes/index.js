const express = require('express');
const router = express.Router();

// Import individual route modules
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const outletsRoutes = require('./outlets'); 
const ridersRoutes = require('./riders');
const vendorsRoutes = require('./vendors');
const paymentsRoutes = require('./payments');
const notificationsRoutes = require('./notifications');
const notificationTemplatesRoutes = require('./notification_templates');
const adminRoutes = require('./admin');
const analyticsRoutes = require('./analytics');
const supportRoutes = require('./support');

// =========================================================================
// API v1 Routes
// =========================================================================

// Authentication & Authorization
router.use('/v1/auth', authRoutes);

// Core Resources
router.use('/v1/users', usersRoutes);
router.use('/v1/products', productsRoutes);
router.use('/v1/orders', ordersRoutes);
router.use('/v1/outlets', outletsRoutes); 
router.use('/v1/riders', ridersRoutes);
router.use('/v1/vendors', vendorsRoutes);
router.use('/v1/payments', paymentsRoutes);

// Communication & Support
router.use('/v1/notifications', notificationsRoutes);
router.use('/v1/notification_templates', notificationTemplatesRoutes);
router.use('/v1/support', supportRoutes);

// Admin & Analytics
router.use('/v1/admin', adminRoutes);
router.use('/v1/analytics', analyticsRoutes);

// =========================================================================
// Health Check & API Info
// =========================================================================

/**
 * @route   GET /api/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Smart Gas Delivery API',
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

/**
 * @route   GET /api/v1
 * @desc    API information and available endpoints
 * @access  Public
 */
router.get('/v1', (req, res) => {
  res.json({
    message: 'Smart Gas Delivery API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      products: '/api/v1/products',
      orders: '/api/v1/orders',
      outlets: '/api/v1/outlets',
      riders: '/api/v1/riders',
      vendors: '/api/v1/vendors',
      payments: '/api/v1/payments',
      notifications: '/api/v1/notifications',
      support: '/api/v1/support',
      admin: '/api/v1/admin',
      analytics: '/api/v1/analytics',
    },
    documentation: {
      outlets: {
        'GET /api/v1/outlets/nearby': 'Get nearby outlets by location',
        'GET /api/v1/outlets/:id/products': 'Get outlet with products',
        'GET /api/v1/outlets/:id': 'Get outlet details',
        'GET /api/v1/outlets': 'Get all outlets',
      },
      orders: {
        'POST /api/v1/orders': 'Create new order (guest or authenticated)',
        'GET /api/v1/orders/user': 'Get user order history',
        'GET /api/v1/orders/:id': 'Get order details',
        'PUT /api/v1/orders/:id/status': 'Update order status',
        'PUT /api/v1/orders/:id/cancel': 'Cancel order',
      },
    },
  });
});

// =========================================================================
// 404 Handler for undefined API routes
// =========================================================================

router.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    message: 'The requested API endpoint does not exist',
    hint: 'Visit /api/v1 for available endpoints',
  });
});

module.exports = router;