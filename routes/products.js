// routes/products.js - Product catalog routes
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, optionalAuth } = require('../middleware/authMiddleware');

// Public routes - product browsing
router.get('/', optionalAuth, productController.getProducts);
router.get('/categories', productController.getCategories);
router.get('/featured', productController.getFeaturedProducts);
router.get('/search', productController.searchProducts);
router.get('/:productId', optionalAuth, productController.getProductDetails);

// Product availability and pricing
router.get('/:productId/availability', productController.checkAvailability);
router.get('/:productId/vendors', productController.getProductVendors);

// User-specific routes (require authentication)
router.get('/:productId/reviews', authenticateToken, productController.getProductReviews);
router.post('/:productId/reviews', authenticateToken, productController.addProductReview);

module.exports = router;
