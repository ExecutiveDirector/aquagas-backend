// routes/auth.js - Fixed Authentication routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  authenticateToken,
  requireSuperAdmin,
  requireAdminRole,
  requireVendorRole,
  requireRiderRole,
  requireUserRole
} = require('../middleware/authMiddleware');

// ------------------------
// Authentication & Login
// ------------------------
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// ------------------------
// Registration per role (PUBLIC - no auth required)
// ------------------------
router.post('/register/user', authController.registerUser);
router.post('/register/vendor', authController.registerVendor); // ✅ Removed requireVendorRole
router.post('/register/rider', authController.registerRider);   // ✅ Removed requireRiderRole

// Only super_admin can register new admins
router.post('/register/admin',
  authenticateToken,
  requireSuperAdmin,
  authController.registerAdmin
);

// ------------------------
// Profile management (protected routes)
// ------------------------
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.post('/change-password', authenticateToken, authController.changePassword);

// ------------------------
// Password reset & verification (PUBLIC)
// ------------------------
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-phone', authController.verifyPhone);

// ------------------------
// Protected role-specific test routes
// ------------------------
router.get('/me/user',
  authenticateToken,
  requireUserRole,
  (req, res) => res.json({ message: 'Welcome User', user: req.user })
);

router.get('/me/vendor',
  authenticateToken,
  requireVendorRole,
  (req, res) => res.json({ message: 'Welcome Vendor', user: req.user })
);

router.get('/me/rider',
  authenticateToken,
  requireRiderRole,
  (req, res) => res.json({ message: 'Welcome Rider', user: req.user })
);

router.get('/me/admin',
  authenticateToken,
  requireAdminRole,
  (req, res) => res.json({ message: 'Welcome Admin', user: req.user })
);

module.exports = router;