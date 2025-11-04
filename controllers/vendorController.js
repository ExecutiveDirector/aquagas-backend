const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const { Op } = require('sequelize');

// NOTE: Vendor authentication (login/register) is now handled in controllers/authController.js
// This controller focuses only on vendor business operations

// --------------------------
// Public Vendor Info
// --------------------------
exports.getVendors = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const vendors = await models.vendors.findAll({
      where: { is_active: true }, // Only show active vendors
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['is_featured', 'DESC'], ['rating', 'DESC']], // Featured first, then by rating
    });
    res.json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    next(err);
  }
};

exports.getVendorDetails = async (req, res, next) => {
  try {
    const vendor = await models.vendors.findOne({
      where: { 
        vendor_id: req.params.vendorId,
        is_active: true 
      },
      include: [
        { 
          model: models.vendor_outlets, 
          as: 'vendor_outlets', // Make sure this matches your model association
          required: false 
        }
      ],
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    console.error('Error fetching vendor details:', err);
    next(err);
  }
};

exports.getVendorProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Query through vendor_inventory instead of products table
    // since products don't have vendor_id directly
    const query = `
      SELECT 
        p.*,
        vi.current_stock as stock,
        vi.selling_price as price,
        vi.is_available,
        vo.outlet_name,
        v.business_name as vendor_name
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      INNER JOIN vendors v ON vo.vendor_id = v.vendor_id
      WHERE v.vendor_id = ?
        AND p.is_active = 1
      LIMIT ? OFFSET ?
    `;
    
    const [products] = await sequelize.query(query, {
      replacements: [req.params.vendorId, parseInt(limit), parseInt(offset)],
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(products);
  } catch (err) {
    console.error('Error fetching vendor products:', err);
    next(err);
  }
};

exports.getVendorReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const reviews = await models.order_reviews.findAll({
      where: { vendor_id: req.params.vendorId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching vendor reviews:', err);
    next(err);
  }
};

// --------------------------
// Protected Vendor Routes
// --------------------------

exports.getDashboardStats = async (req, res, next) => {
  try {
    const vendorId = req.vendor.vendor_id;
    
    // Count products through vendor_inventory
    const productCountQuery = `
      SELECT COUNT(DISTINCT p.product_id) as total
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      WHERE vo.vendor_id = ?
    `;
    
    const [[productResult]] = await sequelize.query(productCountQuery, {
      replacements: [vendorId],
      type: sequelize.QueryTypes.SELECT
    });
    
    const [totalOrders, pendingOrders, revenue] = await Promise.all([
      models.orders.count({ where: { vendor_id: vendorId } }),
      models.orders.count({ where: { vendor_id: vendorId, status: 'pending' } }),
      models.orders.sum('order_value', { where: { vendor_id: vendorId, status: 'delivered' } })
    ]);

    res.json({ 
      totalOrders, 
      pendingOrders, 
      revenue: revenue || 0,
      totalProducts: productResult?.total || 0
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    next(err);
  }
};

exports.getRecentOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const orders = await models.orders.findAll({
      where: { vendor_id: req.vendor.vendor_id },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: models.users,
          as: 'user', // Check your model association name
          attributes: ['full_name', 'phone'],
          required: false
        }
      ]
    });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching recent orders:', err);
    next(err);
  }
};

exports.getInventory = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get inventory through vendor_outlets
    const query = `
      SELECT 
        vi.*,
        p.product_name,
        p.product_code,
        p.brand,
        p.base_price,
        p.product_images,
        vo.outlet_name
      FROM vendor_inventory vi
      INNER JOIN products p ON vi.product_id = p.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      WHERE vo.vendor_id = ?
      ORDER BY p.product_name ASC
      LIMIT ? OFFSET ?
    `;
    
    const [inventory] = await sequelize.query(query, {
      replacements: [req.vendor.vendor_id, parseInt(limit), parseInt(offset)],
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    next(err);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    const { inventoryId } = req.params;
    const updates = req.body;
    
    // Find inventory item and verify vendor ownership
    const query = `
      SELECT vi.*
      FROM vendor_inventory vi
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      WHERE vi.inventory_id = ? AND vo.vendor_id = ?
    `;
    
    const [[inventory]] = await sequelize.query(query, {
      replacements: [inventoryId, req.vendor.vendor_id],
      type: sequelize.QueryTypes.SELECT
    });
    
    if (!inventory) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // Update inventory
    const updateQuery = `
      UPDATE vendor_inventory 
      SET current_stock = ?,
          selling_price = ?,
          is_available = ?,
          last_restocked_at = ?
      WHERE inventory_id = ?
    `;
    
    await sequelize.query(updateQuery, {
      replacements: [
        updates.current_stock || inventory.current_stock,
        updates.selling_price || inventory.selling_price,
        updates.is_available !== undefined ? updates.is_available : inventory.is_available,
        updates.current_stock ? new Date() : inventory.last_restocked_at,
        inventoryId
      ],
      type: sequelize.QueryTypes.UPDATE
    });

    res.json({ message: 'Inventory updated successfully' });
  } catch (err) {
    console.error('Error updating inventory:', err);
    next(err);
  }
};

exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, threshold = 5 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        vi.*,
        p.product_name,
        p.product_code,
        p.brand,
        vo.outlet_name
      FROM vendor_inventory vi
      INNER JOIN products p ON vi.product_id = p.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      WHERE vo.vendor_id = ?
        AND vi.current_stock < ?
        AND vi.is_available = 1
      ORDER BY vi.current_stock ASC
      LIMIT ? OFFSET ?
    `;
    
    const [lowStockItems] = await sequelize.query(query, {
      replacements: [
        req.vendor.vendor_id, 
        parseInt(threshold),
        parseInt(limit), 
        parseInt(offset)
      ],
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(lowStockItems);
  } catch (err) {
    console.error('Error fetching low stock alerts:', err);
    next(err);
  }
};

exports.getVendorOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    const where = { vendor_id: req.vendor.vendor_id };
    if (status) where.status = status;
    
    const orders = await models.orders.findAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: models.users,
          as: 'user', // Check your model association name
          attributes: ['full_name', 'phone'],
          required: false
        }
      ]
    });
    
    res.json(orders);
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const order = await models.orders.findOne({
      where: {
        order_id: req.params.orderId,
        vendor_id: req.vendor.vendor_id
      }
    });
    
    if (!order) return res.status(404).json({ error: 'Order not found' });

    await order.update({ 
      status, 
      updated_at: new Date() 
    });
    
    res.json({ message: 'Order status updated successfully', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    next(err);
  }
};

exports.getVendorOrderDetails = async (req, res, next) => {
  try {
    const order = await models.orders.findOne({
      where: {
        order_id: req.params.orderId,
        vendor_id: req.vendor.vendor_id
      },
      include: [
        { 
          model: models.order_items, 
          as: 'order_items', // Check your model association
          include: [
            {
              model: models.products,
              as: 'product',
              attributes: ['product_name', 'base_price']
            }
          ]
        },
        {
          model: models.users,
          as: 'user', // Check your model association
          attributes: ['full_name', 'phone', 'email']
        },
        {
          model: models.riders,
          as: 'rider',
          attributes: ['full_name', 'phone'],
          required: false
        }
      ],
    });
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching order details:', err);
    next(err);
  }
};

exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const vendorId = req.vendor.vendor_id;
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const [revenue, orderCount, avgOrderValue] = await Promise.all([
      models.orders.sum('order_value', {
        where: { 
          vendor_id: vendorId, 
          status: 'delivered',
          created_at: { [Op.gte]: startDate }
        }
      }),
      models.orders.count({
        where: { 
          vendor_id: vendorId,
          created_at: { [Op.gte]: startDate }
        }
      }),
      models.orders.findOne({
        where: { 
          vendor_id: vendorId, 
          status: 'delivered',
          created_at: { [Op.gte]: startDate }
        },
        attributes: [[sequelize.fn('AVG', sequelize.col('order_value')), 'avgValue']]
      })
    ]);
    
    res.json({ 
      revenue: revenue || 0,
      orderCount,
      avgOrderValue: avgOrderValue?.dataValues?.avgValue || 0,
      period,
      startDate
    });
  } catch (err) {
    console.error('Error fetching sales analytics:', err);
    next(err);
  }
};

exports.getProductAnalytics = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.product_code,
        p.base_price,
        COUNT(oi.order_item_id) as order_count,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as total_revenue
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      LEFT JOIN order_items oi ON p.product_id = oi.product_id
      WHERE vo.vendor_id = ?
      GROUP BY p.product_id, p.product_name, p.product_code, p.base_price
      ORDER BY total_sold DESC
      LIMIT ? OFFSET ?
    `;
    
    const [productSales] = await sequelize.query(query, {
      replacements: [req.vendor.vendor_id, parseInt(limit), parseInt(offset)],
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(productSales);
  } catch (err) {
    console.error('Error fetching product analytics:', err);
    next(err);
  }
};

exports.getOutlets = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const outlets = await models.vendor_outlets.findAll({
      where: { vendor_id: req.vendor.vendor_id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['outlet_name', 'ASC']],
    });
    res.json(outlets);
  } catch (err) {
    console.error('Error fetching outlets:', err);
    next(err);
  }
};

exports.createOutlet = async (req, res, next) => {
  try {
    const { outlet_name, outlet_code, latitude, longitude, address_line_1, city, county } = req.body;
    
    // Validate required fields
    if (!outlet_name || !outlet_code || !latitude || !longitude || !address_line_1 || !city || !county) {
      return res.status(400).json({ 
        error: 'Missing required fields: outlet_name, outlet_code, latitude, longitude, address_line_1, city, county' 
      });
    }
    
    // Get next outlet_id
    const [[{ nextId }]] = await sequelize.query(
      'SELECT COALESCE(MAX(outlet_id), 0) + 1 as nextId FROM vendor_outlets'
    );
    
    const outletData = {
      outlet_id: nextId,
      vendor_id: req.vendor.vendor_id,
      outlet_name,
      outlet_code,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      location: sequelize.fn('POINT', parseFloat(latitude), parseFloat(longitude)),
      address_line_1,
      city,
      county,
      ...req.body
    };
    
    const outlet = await models.vendor_outlets.create(outletData);
    
    res.status(201).json({ message: 'Outlet created successfully', outlet });
  } catch (err) {
    console.error('Error creating outlet:', err);
    next(err);
  }
};

exports.updateOutlet = async (req, res, next) => {
  try {
    const outlet = await models.vendor_outlets.findOne({
      where: {
        outlet_id: req.params.outletId,
        vendor_id: req.vendor.vendor_id
      }
    });
    
    if (!outlet) return res.status(404).json({ error: 'Outlet not found' });

    const updates = { ...req.body };
    
    // Update location if coordinates changed
    if (req.body.latitude && req.body.longitude) {
      updates.location = sequelize.fn(
        'POINT', 
        parseFloat(req.body.latitude), 
        parseFloat(req.body.longitude)
      );
    }

    await outlet.update(updates);

    res.json({ message: 'Outlet updated successfully', outlet });
  } catch (err) {
    console.error('Error updating outlet:', err);
    next(err);
  }
};

/**
 * GET /vendor/products
 * Get all products for the authenticated vendor
 */
exports.getVendorProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', category_id } = req.query;
    const offset = (page - 1) * limit;
    const vendorId = req.vendor.vendor_id;
    
    let whereClause = 'WHERE vo.vendor_id = ?';
    const replacements = [vendorId];
    
    // Add search filter
    if (search) {
      whereClause += ' AND (p.product_name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)';
      const searchTerm = `%${search}%`;
      replacements.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Add category filter
    if (category_id) {
      whereClause += ' AND p.category_id = ?';
      replacements.push(parseInt(category_id));
    }
    
    const query = `
      SELECT 
        p.*,
        vi.current_stock,
        vi.selling_price,
        vi.is_available,
        vi.inventory_id,
        vo.outlet_name,
        vo.outlet_id,
        c.category_name
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      LEFT JOIN product_categories c ON p.category_id = c.category_id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    replacements.push(parseInt(limit), parseInt(offset));
    
    const [products] = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(products || []);
  } catch (err) {
    console.error('Error fetching vendor products:', err);
    next(err);
  }
};

/**
 * POST /vendor/products
 * Create a new product
 */
exports.createProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const vendorId = req.vendor.vendor_id;
    const {
      product_name,
      product_code,
      category_id,
      brand,
      base_price,
      min_price,
      max_price,
      stock_quantity,
      size_specification,
      unit_of_measure,
      weight_kg,
      carbon_footprint_kg,
      description,
      is_active,
      is_featured,
      product_images,
      outlet_id, // Optional: specific outlet, otherwise use default
    } = req.body;
    
    // Validate required fields
    if (!product_name || !product_code || !category_id || !base_price || stock_quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: product_name, product_code, category_id, base_price, stock_quantity' 
      });
    }
    
    // Check if product_code already exists
    const existingProduct = await models.products.findOne({
      where: { product_code },
      transaction
    });
    
    if (existingProduct) {
      await transaction.rollback();
      return res.status(409).json({ 
        error: 'Product code already exists. Please use a unique code.' 
      });
    }
    
    // Get next product_id
    const [[{ nextProductId }]] = await sequelize.query(
      'SELECT COALESCE(MAX(product_id), 0) + 1 as nextProductId FROM products',
      { transaction }
    );
    
    // Create product
    const productData = {
      product_id: nextProductId,
      product_name,
      product_code,
      category_id: parseInt(category_id),
      brand: brand || null,
      base_price: parseFloat(base_price),
      min_price: min_price ? parseFloat(min_price) : null,
      max_price: max_price ? parseFloat(max_price) : null,
      stock_quantity: parseInt(stock_quantity),
      size_specification: size_specification || null,
      unit_of_measure: unit_of_measure || 'kg',
      weight_kg: weight_kg ? parseFloat(weight_kg) : null,
      carbon_footprint_kg: carbon_footprint_kg ? parseFloat(carbon_footprint_kg) : null,
      description: description || null,
      is_active: is_active !== undefined ? is_active : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      product_images: product_images || null,
    };
    
    const product = await models.products.create(productData, { transaction });
    
    // Get vendor's outlet (use provided outlet_id or get first active outlet)
    let targetOutletId = outlet_id;
    
    if (!targetOutletId) {
      const defaultOutlet = await models.vendor_outlets.findOne({
        where: { vendor_id: vendorId },
        order: [['created_at', 'ASC']],
        transaction
      });
      
      if (!defaultOutlet) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'No outlet found. Please create an outlet first or specify outlet_id.' 
        });
      }
      
      targetOutletId = defaultOutlet.outlet_id;
    } else {
      // Verify outlet belongs to vendor
      const outlet = await models.vendor_outlets.findOne({
        where: { 
          outlet_id: targetOutletId,
          vendor_id: vendorId 
        },
        transaction
      });
      
      if (!outlet) {
        await transaction.rollback();
        return res.status(403).json({ 
          error: 'Invalid outlet_id or outlet does not belong to your business.' 
        });
      }
    }
    
    // Get next inventory_id
    const [[{ nextInventoryId }]] = await sequelize.query(
      'SELECT COALESCE(MAX(inventory_id), 0) + 1 as nextInventoryId FROM vendor_inventory',
      { transaction }
    );
    
    // Create inventory entry
    await models.vendor_inventory.create({
      inventory_id: nextInventoryId,
      outlet_id: targetOutletId,
      product_id: product.product_id,
      current_stock: parseInt(stock_quantity),
      reserved_stock: 0,
      minimum_stock_level: 5,
      maximum_stock_level: 100,
      reorder_point: 10,
      cost_price: parseFloat(base_price) * 0.7, // Default: 70% of selling price
      selling_price: parseFloat(base_price),
      is_available: true,
      last_restocked_at: new Date(),
    }, { transaction });
    
    await transaction.commit();
    
    res.status(201).json({ 
      message: 'Product created successfully', 
      product 
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error creating product:', err);
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: 'Product with this code already exists' 
      });
    }
    
    next(err);
  }
};

/**
 * DELETE /vendor/products/:productId
 * Delete a product (soft delete by marking as inactive)
 */
exports.deleteProduct = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { productId } = req.params;
    const vendorId = req.vendor.vendor_id;
    
    // Verify product belongs to vendor through inventory
    const query = `
      SELECT p.*, vi.inventory_id, vo.outlet_id
      FROM products p
      INNER JOIN vendor_inventory vi ON p.product_id = vi.product_id
      INNER JOIN vendor_outlets vo ON vi.outlet_id = vo.outlet_id
      WHERE p.product_id = ? AND vo.vendor_id = ?
      LIMIT 1
    `;
    
    const [[product]] = await sequelize.query(query, {
      replacements: [productId, vendorId],
      type: sequelize.QueryTypes.SELECT,
      transaction
    });
    
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({ 
        error: 'Product not found or does not belong to your business' 
      });
    }
    
    // Check if product has pending orders
    const pendingOrdersQuery = `
      SELECT COUNT(*) as count
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.order_id
      WHERE oi.product_id = ? 
        AND o.vendor_id = ?
        AND o.status IN ('pending', 'confirmed', 'preparing', 'ready', 'dispatched')
    `;
    
    const [[{ count }]] = await sequelize.query(pendingOrdersQuery, {
      replacements: [productId, vendorId],
      type: sequelize.QueryTypes.SELECT,
      transaction
    });
    
    if (count > 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot delete product. It has ${count} pending order(s). Please complete or cancel those orders first.` 
      });
    }
    
    // Soft delete: Mark as inactive
    await sequelize.query(
      'UPDATE products SET is_active = 0, updated_at = NOW() WHERE product_id = ?',
      {
        replacements: [productId],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );
    
    // Mark inventory as unavailable
    await sequelize.query(
      'UPDATE vendor_inventory SET is_available = 0 WHERE product_id = ?',
      {
        replacements: [productId],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      }
    );
    
    await transaction.commit();
    
    res.json({ 
      message: 'Product deleted successfully',
      note: 'Product has been marked as inactive and is no longer visible to customers.'
    });
  } catch (err) {
    await transaction.rollback();
    console.error('Error deleting product:', err);
    next(err);
  }
};

/**
 * GET /vendor/product_categories
 * Get all product categories
 */
exports.getProductCategories = async (req, res, next) => {
  try {
    const categories = await models.product_categories.findAll({
      where: { is_active: true },
      order: [['category_name', 'ASC']],
      attributes: ['category_id', 'category_name', 'description']
    });
    
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    next(err);
  }
};

/**
 * POST /vendor/upload-image
 * Upload product images (placeholder - implement with actual file upload middleware)
 */
exports.uploadProductImage = async (req, res, next) => {
  try {
    // This is a placeholder. Implement with multer or similar
    // Example with multer:
    // const multer = require('multer');
    // const upload = multer({ dest: 'uploads/' });
    
    if (!req.file && !req.files) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Process file upload (save to S3, Cloudinary, or local storage)
    // Return the URL
    const imageUrl = `/uploads/${req.file.filename}`; // Example
    
    res.json({ 
      message: 'Image uploaded successfully',
      url: imageUrl 
    });
  } catch (err) {
    console.error('Error uploading image:', err);
    next(err);
  }
};

module.exports = exports;