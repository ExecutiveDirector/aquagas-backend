// controllers/outletController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const { Op } = require('sequelize');

const isDevelopment = process.env.NODE_ENV !== 'production';

// =========================================================================
// GET NEARBY OUTLETS (with distance calculation)
// =========================================================================
exports.getNearbyOutlets = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50, limit = 20 } = req.query;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Missing required parameters: latitude and longitude' 
      });
    }

    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);
    const searchRadius = parseFloat(radius); // in kilometers

    if (isDevelopment) {
      console.log('📍 Fetching nearby outlets:', {
        userLocation: { lat: userLat, lng: userLng },
        radius: `${searchRadius}km`,
        limit,
      });
    }

    // Query outlets with distance calculation
    // Using Haversine formula for distance calculation
    const outlets = await sequelize.query(`
      SELECT 
        vo.outlet_id,
        vo.outlet_name,
        vo.vendor_id,
        v.business_name as vendor_name,
        vo.latitude,
        vo.longitude,
        vo.address_line_1,
        vo.address_line_2,
        vo.city,
        vo.county,
        vo.postal_code,
        vo.phone,
        vo.email,
        vo.is_active,
        vo.opening_time,
        vo.closing_time,
        vo.created_at,
        (
          6371 * acos(
            cos(radians(:userLat)) * 
            cos(radians(vo.latitude)) * 
            cos(radians(vo.longitude) - radians(:userLng)) + 
            sin(radians(:userLat)) * 
            sin(radians(vo.latitude))
          )
        ) AS distance_km,
        CASE
          WHEN vo.opening_time IS NULL OR vo.closing_time IS NULL THEN true
          WHEN TIME(NOW()) BETWEEN vo.opening_time AND vo.closing_time THEN true
          ELSE false
        END AS is_open
      FROM vendor_outlets vo
      INNER JOIN vendors v ON vo.vendor_id = v.vendor_id
      WHERE vo.is_active = true
      AND vo.latitude IS NOT NULL 
      AND vo.longitude IS NOT NULL
      HAVING distance_km <= :searchRadius
      ORDER BY distance_km ASC
      LIMIT :limit
    `, {
      replacements: {
        userLat,
        userLng,
        searchRadius,
        limit: parseInt(limit),
      },
      type: sequelize.QueryTypes.SELECT,
    });

    if (isDevelopment) {
      console.log(`✅ Found ${outlets.length} nearby outlets`);
    }

    // Format response for Flutter
    const formattedOutlets = outlets.map(outlet => ({
      outlet_id: outlet.outlet_id.toString(),
      outlet_name: outlet.outlet_name,
      vendor_id: outlet.vendor_id.toString(),
      vendor_name: outlet.vendor_name,
      location: {
        lat: parseFloat(outlet.latitude),
        lng: parseFloat(outlet.longitude),
      },
      distance: parseFloat(outlet.distance_km.toFixed(2)),
      distance_km: parseFloat(outlet.distance_km.toFixed(2)),
      is_open: Boolean(outlet.is_open),
      address: [
        outlet.address_line_1,
        outlet.address_line_2,
        outlet.city,
        outlet.county,
      ].filter(Boolean).join(', '),
      phone: outlet.phone,
      email: outlet.email,
      opening_time: outlet.opening_time,
      closing_time: outlet.closing_time,
    }));

    res.json({
      outlets: formattedOutlets,
      count: formattedOutlets.length,
      user_location: { lat: userLat, lng: userLng },
      search_radius_km: searchRadius,
    });
  } catch (err) {
    console.error('❌ Error fetching nearby outlets:', err);
    res.status(500).json({
      error: 'Failed to fetch nearby outlets',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// GET OUTLET WITH PRODUCTS
// =========================================================================
exports.getOutletWithProducts = async (req, res) => {
  try {
    const { outletId } = req.params;
    const { category, search, in_stock = true } = req.query;

    if (isDevelopment) {
      console.log('📦 Fetching outlet with products:', outletId);
    }

    // Fetch outlet details
    const outlet = await models.vendor_outlets.findByPk(outletId, {
      include: [{
        model: models.vendors,
        as: 'vendor',
        attributes: ['vendor_id', 'business_name', 'business_phone', 'business_email'],
      }],
    });

    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    // Build product query
    const productWhere = { outlet_id: outletId };
    
    if (in_stock === 'true' || in_stock === true) {
      productWhere.stock_quantity = { [Op.gt]: 0 };
    }

    if (category) {
      productWhere.category_id = category;
    }

    if (search) {
      productWhere.product_name = { [Op.like]: `%${search}%` };
    }

    // Fetch products
    const products = await models.products.findAll({
      where: productWhere,
      include: [
        {
          model: models.product_categories,
          as: 'category',
          attributes: ['category_id', 'category_name'],
        },
      ],
      order: [['product_name', 'ASC']],
    });

    if (isDevelopment) {
      console.log(`✅ Found ${products.length} products for outlet ${outletId}`);
    }

    // Format response
    const response = {
      outlet_id: outlet.outlet_id.toString(),
      outlet_name: outlet.outlet_name,
      vendor_id: outlet.vendor_id.toString(),
      vendor_name: outlet.vendor?.business_name || null,
      location: {
        lat: outlet.latitude ? parseFloat(outlet.latitude) : null,
        lng: outlet.longitude ? parseFloat(outlet.longitude) : null,
      },
      address: [
        outlet.address_line_1,
        outlet.address_line_2,
        outlet.city,
        outlet.county,
      ].filter(Boolean).join(', '),
      phone: outlet.phone,
      email: outlet.email,
      is_open: outlet.opening_time && outlet.closing_time ? 
        _isOutletOpen(outlet.opening_time, outlet.closing_time) : true,
      opening_time: outlet.opening_time,
      closing_time: outlet.closing_time,
      products: products.map(product => ({
        product_id: product.product_id.toString(),
        product_name: product.product_name,
        description: product.description,
        price: parseFloat(product.current_price || 0),
        current_price: parseFloat(product.current_price || 0),
        image_url: product.image_url,
        category: product.category?.category_name || null,
        category_id: product.category_id?.toString() || null,
        stock_quantity: product.stock_quantity || 0,
        unit: product.unit || 'piece',
        is_available: (product.stock_quantity || 0) > 0,
      })),
      product_count: products.length,
    };

    res.json(response);
  } catch (err) {
    console.error('❌ Error fetching outlet with products:', err);
    res.status(500).json({
      error: 'Failed to fetch outlet products',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// GET ALL OUTLETS (for vendor dashboard)
// =========================================================================
exports.getAllOutlets = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, is_active } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (search) {
      whereClause.outlet_name = { [Op.like]: `%${search}%` };
    }

    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    const outlets = await models.vendor_outlets.findAndCountAll({
      where: whereClause,
      include: [{
        model: models.vendors,
        as: 'vendor',
        attributes: ['vendor_id', 'business_name'],
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['outlet_name', 'ASC']],
    });

    if (isDevelopment) {
      console.log(`✅ Found ${outlets.count} outlets (page ${page})`);
    }

    res.json({
      outlets: outlets.rows.map(outlet => ({
        outlet_id: outlet.outlet_id.toString(),
        outlet_name: outlet.outlet_name,
        vendor_id: outlet.vendor_id.toString(),
        vendor_name: outlet.vendor?.business_name || null,
        location: {
          lat: outlet.latitude ? parseFloat(outlet.latitude) : null,
          lng: outlet.longitude ? parseFloat(outlet.longitude) : null,
        },
        address: [
          outlet.address_line_1,
          outlet.city,
          outlet.county,
        ].filter(Boolean).join(', '),
        is_active: outlet.is_active,
        phone: outlet.phone,
        created_at: outlet.created_at,
      })),
      total: outlets.count,
      page: parseInt(page),
      total_pages: Math.ceil(outlets.count / limit),
    });
  } catch (err) {
    console.error('❌ Error fetching outlets:', err);
    res.status(500).json({
      error: 'Failed to fetch outlets',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// GET SINGLE OUTLET DETAILS
// =========================================================================
exports.getOutletById = async (req, res) => {
  try {
    const { outletId } = req.params;

    const outlet = await models.vendor_outlets.findByPk(outletId, {
      include: [{
        model: models.vendors,
        as: 'vendor',
        attributes: ['vendor_id', 'business_name', 'business_phone', 'business_email'],
      }],
    });

    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    res.json({
      outlet: {
        outlet_id: outlet.outlet_id.toString(),
        outlet_name: outlet.outlet_name,
        outlet_code: outlet.outlet_code,
        vendor_id: outlet.vendor_id.toString(),
        vendor_name: outlet.vendor?.business_name || null,
        location: {
          lat: outlet.latitude ? parseFloat(outlet.latitude) : null,
          lng: outlet.longitude ? parseFloat(outlet.longitude) : null,
        },
        address: {
          line_1: outlet.address_line_1,
          line_2: outlet.address_line_2,
          city: outlet.city,
          county: outlet.county,
          postal_code: outlet.postal_code,
        },
        phone: outlet.phone,
        email: outlet.email,
        is_active: outlet.is_active,
        is_open: outlet.opening_time && outlet.closing_time ? 
          _isOutletOpen(outlet.opening_time, outlet.closing_time) : true,
        opening_time: outlet.opening_time,
        closing_time: outlet.closing_time,
        created_at: outlet.created_at,
      }
    });
  } catch (err) {
    console.error('❌ Error fetching outlet:', err);
    res.status(500).json({
      error: 'Failed to fetch outlet',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// VENDOR-SPECIFIC OUTLET MANAGEMENT
// =========================================================================
exports.getVendorOutlets = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const vendorId = req.user.vendor_id;
    
    if (!vendorId) {
      return res.status(403).json({ error: 'Not authorized as vendor' });
    }

    const outlets = await models.vendor_outlets.findAll({
      where: { vendor_id: vendorId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['outlet_name', 'ASC']],
    });

    res.json({
      outlets: outlets.map(outlet => ({
        outlet_id: outlet.outlet_id.toString(),
        outlet_name: outlet.outlet_name,
        outlet_code: outlet.outlet_code,
        location: {
          lat: outlet.latitude ? parseFloat(outlet.latitude) : null,
          lng: outlet.longitude ? parseFloat(outlet.longitude) : null,
        },
        address: [outlet.address_line_1, outlet.city].filter(Boolean).join(', '),
        is_active: outlet.is_active,
        phone: outlet.phone,
      })),
      count: outlets.length,
    });
  } catch (err) {
    console.error('❌ Error fetching vendor outlets:', err);
    res.status(500).json({
      error: 'Failed to fetch outlets',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

exports.createOutlet = async (req, res) => {
  try {
    const { 
      outlet_name, 
      outlet_code, 
      latitude, 
      longitude, 
      address_line_1, 
      city, 
      county 
    } = req.body;
    
    const vendorId = req.user.vendor_id;
    
    if (!vendorId) {
      return res.status(403).json({ error: 'Not authorized as vendor' });
    }
    
    // Validate required fields
    if (!outlet_name || !outlet_code || !latitude || !longitude || !address_line_1 || !city || !county) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['outlet_name', 'outlet_code', 'latitude', 'longitude', 'address_line_1', 'city', 'county']
      });
    }
    
    const outletData = {
      vendor_id: vendorId,
      outlet_name,
      outlet_code,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address_line_1,
      city,
      county,
      ...req.body // Include other optional fields
    };
    
    const outlet = await models.vendor_outlets.create(outletData);
    
    res.status(201).json({ 
      message: 'Outlet created successfully', 
      outlet: {
        outlet_id: outlet.outlet_id.toString(),
        outlet_name: outlet.outlet_name,
        outlet_code: outlet.outlet_code,
      }
    });
  } catch (err) {
    console.error('❌ Error creating outlet:', err);
    res.status(500).json({
      error: 'Failed to create outlet',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

exports.updateOutlet = async (req, res) => {
  try {
    const { outletId } = req.params;
    const vendorId = req.user.vendor_id;
    
    if (!vendorId) {
      return res.status(403).json({ error: 'Not authorized as vendor' });
    }
    
    const outlet = await models.vendor_outlets.findOne({
      where: {
        outlet_id: outletId,
        vendor_id: vendorId
      }
    });
    
    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    const updates = { ...req.body };
    
    // Update coordinates if provided
    if (req.body.latitude) updates.latitude = parseFloat(req.body.latitude);
    if (req.body.longitude) updates.longitude = parseFloat(req.body.longitude);

    await outlet.update(updates);

    res.json({ 
      message: 'Outlet updated successfully', 
      outlet: {
        outlet_id: outlet.outlet_id.toString(),
        outlet_name: outlet.outlet_name,
      }
    });
  } catch (err) {
    console.error('❌ Error updating outlet:', err);
    res.status(500).json({
      error: 'Failed to update outlet',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function _isOutletOpen(openingTime, closingTime) {
  if (!openingTime || !closingTime) return true;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);
  
  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;
  
  return currentTime >= openMinutes && currentTime <= closeMinutes;
}

module.exports = exports;