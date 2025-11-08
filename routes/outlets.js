// routes/outlets.js
const express = require('express');
const router = express.Router();
const outletController = require('../controllers/outletController');

const { 
  authenticateToken, 
  optionalAuth,
  requireVendorRole,
  requireAdminRole 
} = require('../middleware/auth');

// =========================================================================
// PUBLIC ROUTES (No authentication required)
// =========================================================================

/**
 * @route   GET /api/v1/outlets/nearby
 * @desc    Get nearby outlets based on user location
 * @access  Public
 * @query   {
 *   latitude: number (required),
 *   longitude: number (required),
 *   radius: number (optional, default: 50km),
 *   limit: number (optional, default: 20)
 * }
 * @example GET /api/v1/outlets/nearby?latitude=-1.2921&longitude=36.8219&radius=10
 */
router.get('/nearby', outletController.getNearbyOutlets);

/**
 * @route   GET /api/v1/outlets/:outletId/products
 * @desc    Get outlet details with all available products
 * @access  Public
 * @query   {
 *   category: string (optional, filter by category_id),
 *   search: string (optional, search product names),
 *   in_stock: boolean (optional, default: true, show only in-stock items)
 * }
 */
router.get('/:outletId/products', outletController.getOutletWithProducts);

/**
 * @route   GET /api/v1/outlets/:outletId
 * @desc    Get single outlet details
 * @access  Public
 */
router.get('/:outletId', outletController.getOutletById);

/**
 * @route   GET /api/v1/outlets
 * @desc    Get all outlets (paginated, searchable)
 * @access  Public
 * @query   {
 *   page: number (optional, default: 1),
 *   limit: number (optional, default: 20),
 *   search: string (optional, search outlet names),
 *   is_active: boolean (optional, filter by active status)
 * }
 */
router.get('/', outletController.getAllOutlets);

// =========================================================================
// VENDOR ROUTES (Vendor authentication required)
// =========================================================================

/**
 * @route   GET /api/v1/outlets/vendor/my-outlets
 * @desc    Get outlets belonging to authenticated vendor
 * @access  Private (Vendor only)
 * @query   {
 *   page: number (optional, default: 1),
 *   limit: number (optional, default: 20)
 * }
 */
router.get('/vendor/my-outlets', authenticateToken, requireVendorRole, outletController.getVendorOutlets);

/**
 * @route   POST /api/v1/outlets
 * @desc    Create new outlet (vendor only)
 * @access  Private (Vendor/Admin)
 * @body    {
 *   outlet_name: string (required),
 *   outlet_code: string (required),
 *   latitude: number (required),
 *   longitude: number (required),
 *   address_line_1: string (required),
 *   address_line_2: string (optional),
 *   city: string (required),
 *   county: string (required),
 *   postal_code: string (optional),
 *   phone: string (optional),
 *   email: string (optional),
 *   opening_time: string (optional, format: HH:mm:ss),
 *   closing_time: string (optional, format: HH:mm:ss)
 * }
 */
router.post('/', authenticateToken, requireVendorRole, outletController.createOutlet);

/**
 * @route   PUT /api/v1/outlets/:outletId
 * @desc    Update outlet details (vendor only - can only update own outlets)
 * @access  Private (Vendor/Admin)
 */
router.put('/:outletId', authenticateToken, requireVendorRole, outletController.updateOutlet);

module.exports = router;