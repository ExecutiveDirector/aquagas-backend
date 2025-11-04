// routes/auth.js - Phone OTP Authentication Routes
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
// Traditional Login (Email/Password)
// ------------------------
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// ------------------------
// Phone OTP Authentication (NEW)
// ------------------------
router.post('/send-otp', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/register/phone', authController.registerWithPhone);

// ------------------------
// Traditional Registration per role
// ------------------------
router.post('/register/user', authController.registerUser);
router.post('/register/vendor', authController.registerVendor);
router.post('/register/rider', authController.registerRider);

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
router.get('/check-password-status', authenticateToken, authController.checkPasswordStatus);

// ------------------------
// Password reset & verification
// ------------------------
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-phone', authController.verifyPhone);
router.post('/send-phone-verification', authController.sendPhoneVerification);

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