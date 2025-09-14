const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

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
    const vendor = await models.vendors.findByPk(req.params.vendorId, {
      where: { is_active: true },
      include: [
        { 
          model: models.vendor_outlets, 
          as: 'outlets',
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
    const products = await models.products.findAll({
      where: { vendor_id: req.params.vendorId },
      limit: parseInt(limit),
      offset: parseInt(offset),
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
    
    const [totalOrders, pendingOrders, revenue, totalProducts] = await Promise.all([
      models.orders.count({ where: { vendor_id: vendorId } }),
      models.orders.count({ where: { vendor_id: vendorId, status: 'pending' } }),
      models.orders.sum('order_value', { where: { vendor_id: vendorId, status: 'delivered' } }),
      models.products.count({ where: { vendor_id: vendorId } })
    ]);

    res.json({ 
      totalOrders, 
      pendingOrders, 
      revenue: revenue || 0,
      totalProducts
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
          as: 'customer',
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
    const products = await models.products.findAll({
      where: { vendor_id: req.vendor.vendor_id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['product_name', 'ASC']],
    });
    res.json(products);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    next(err);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const updates = req.body;
    
    const product = await models.products.findOne({
      where: { 
        product_id: productId,
        vendor_id: req.vendor.vendor_id // Ensure vendor owns this product
      }
    });
    
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Update product
    await product.update(updates);

    res.json({ message: 'Inventory updated successfully', product });
  } catch (err) {
    console.error('Error updating inventory:', err);
    next(err);
  }
};

exports.recordInventoryMovement = async (req, res, next) => {
  try {
    const { product_id, quantity, type } = req.body;
    
    // Verify product belongs to vendor
    const product = await models.products.findOne({
      where: { 
        product_id,
        vendor_id: req.vendor.vendor_id
      }
    });
    
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await models.inventory_movements.create({
      product_id,
      quantity,
      type,
      recorded_at: new Date(),
    });
    
    res.json({ message: 'Inventory movement recorded successfully' });
  } catch (err) {
    console.error('Error recording inventory movement:', err);
    next(err);
  }
};

exports.getLowStockAlerts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, threshold = 5 } = req.query;
    const offset = (page - 1) * limit;
    
    const products = await models.products.findAll({
      where: { 
        vendor_id: req.vendor.vendor_id, 
        stock_quantity: { [sequelize.Op.lt]: parseInt(threshold) },
        is_active: true
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['stock_quantity', 'ASC']],
    });
    
    res.json(products);
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
          as: 'customer',
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

    await order.update({ status, updated_at: new Date() });
    
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
          as: 'items',
          include: [
            {
              model: models.products,
              as: 'product',
              attributes: ['product_name', 'price']
            }
          ]
        },
        {
          model: models.users,
          as: 'customer',
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
          created_at: { [sequelize.Op.gte]: startDate }
        }
      }),
      models.orders.count({
        where: { 
          vendor_id: vendorId,
          created_at: { [sequelize.Op.gte]: startDate }
        }
      }),
      models.orders.findOne({
        where: { 
          vendor_id: vendorId, 
          status: 'delivered',
          created_at: { [sequelize.Op.gte]: startDate }
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
    
    // Get products with their sales data
    const productSales = await models.products.findAll({
      where: { vendor_id: req.vendor.vendor_id },
      include: [
        {
          model: models.order_items,
          as: 'order_items',
          attributes: [
            [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold'],
            [sequelize.fn('SUM', sequelize.col('subtotal')), 'total_revenue']
          ],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      group: ['products.product_id'],
      order: [[sequelize.literal('total_sold'), 'DESC']]
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
    const outletData = {
      vendor_id: req.vendor.vendor_id,
      ...req.body,
      created_at: new Date()
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

    await outlet.update({ ...req.body, updated_at: new Date() });

    res.json({ message: 'Outlet updated successfully', outlet });
  } catch (err) {
    console.error('Error updating outlet:', err);
    next(err);
  }
};