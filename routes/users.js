// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireUserRole } = require('../middleware/authMiddleware');

// 🔐 All routes require authentication
router.use(authenticateToken);

// ------------------------
// Profile & Account
// ------------------------
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword); // or PUT /profile/password
router.delete('/account', userController.deleteAccount);

// ------------------------
// Preferences
// ------------------------
router.get('/preferences', userController.getPreferences);
router.put('/preferences', userController.updatePreferences);

// ------------------------
// Wallet
// ------------------------
router.get('/wallet', userController.getWallet);
router.get('/wallet/transactions', userController.getWalletTransactions);

// ------------------------
// Orders
// ------------------------
router.get('/orders', userController.getUserOrders);
router.get('/orders/:orderId', userController.getOrderDetails);

// ------------------------
// Loyalty
// ------------------------
router.get('/loyalty-points', userController.getLoyaltyPoints);
router.get('/loyalty-history', userController.getLoyaltyHistory);

// ------------------------
// Addresses
// ------------------------
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:addressId', userController.updateAddress);
router.delete('/addresses/:addressId', userController.deleteAddress);

module.exports = router;
