const express = require('express');
const router = express.Router();

// Import individual route modules
const usersRoutes = require('./users');
const productsRoutes = require('./products');
const ordersRoutes = require('./orders');
const ridersRoutes = require('./riders');
const vendorsRoutes = require('./vendors');
const paymentsRoutes = require('./payments');
const notificationsRoutes = require('./notifications');
const adminRoutes = require('./admin');
const analyticsRoutes = require('./analytics');
const supportRoutes = require('./support');
const notificationTemplatesRoutes = require('./notification_templates');
const authRoutes = require('./auth'); // ✅ add auth routes

// Mount routers
router.use('/v1/users', usersRoutes);
router.use('/v1/products', productsRoutes);
router.use('/v1/orders', ordersRoutes);
router.use('/v1/riders', ridersRoutes);
router.use('/v1/vendors', vendorsRoutes);
router.use('/v1/payments', paymentsRoutes);
router.use('/v1/notifications', notificationsRoutes);
router.use('/v1/notification_templates', notificationTemplatesRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/analytics', analyticsRoutes);
router.use('/v1/support', supportRoutes);
router.use('/v1/auth', authRoutes); 

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Smart Gas Delivery API',
  });
});

module.exports = router;
