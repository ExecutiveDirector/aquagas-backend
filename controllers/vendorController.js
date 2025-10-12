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

module.exports = exports;