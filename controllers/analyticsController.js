const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const { Op, fn, col, literal } = require('sequelize');
const models = initModels(sequelize);

// ------------------------------
// Analytics Controller
// ------------------------------

/**
 * GET /analytics/overview
 * Returns summary stats for dashboard
 */
exports.getOverviewStats = async (req, res, next) => {
  try {
    const totalUsers = await models.users.count();
    const totalVendors = await models.vendors.count();
    const totalRiders = await models.riders.count();
    const totalOrders = await models.orders.count();
    const totalRevenue = await models.orders.sum('order_value');

    res.json({
      totalUsers,
      totalVendors,
      totalRiders,
      totalOrders,
      totalRevenue,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/sales
 * Returns sales analytics grouped by day/week/month
 */
exports.getSalesAnalytics = async (req, res, next) => {
  try {
    const sales = await models.orders.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('order_value')), 'totalSales'],
        [fn('COUNT', col('id')), 'totalOrders']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
    });

    res.json(sales);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/users
 * Returns user registration trends
 */
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const users = await models.users.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'totalUsers']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/orders
 * Returns order volume trends
 */
exports.getOrderAnalytics = async (req, res, next) => {
  try {
    const orders = await models.orders.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COUNT', col('id')), 'totalOrders'],
        [fn('SUM', col('order_value')), 'totalRevenue']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/delivery-performance
 * Returns delivery stats for riders
 */
exports.getDeliveryPerformance = async (req, res, next) => {
  try {
    const performance = await models.delivery_assignments.findAll({
      attributes: [
        'rider_id',
        [fn('COUNT', col('id')), 'totalDeliveries'],
        [fn('SUM', literal(`CASE WHEN assignment_status = 'completed' THEN 1 ELSE 0 END`)), 'completedDeliveries']
      ],
      group: ['rider_id'],
      include: [{ model: models.riders, as: 'rider', attributes: ['id', 'name'] }]
    });

    res.json(performance);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/rider-performance
 * Returns rider performance metrics
 */
exports.getRiderPerformance = async (req, res, next) => {
  try {
    const metrics = await models.riders.findAll({
      attributes: ['id', 'name'],
      include: [
        {
          model: models.delivery_assignments,
          as: 'delivery_assignments',
          attributes: [
            [fn('COUNT', col('id')), 'totalDeliveries'],
            [fn('SUM', literal(`CASE WHEN assignment_status = 'completed' THEN 1 ELSE 0 END`)), 'completedDeliveries']
          ]
        }
      ]
    });

    res.json(metrics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/vendor-performance
 * Returns vendor performance metrics
 */
exports.getVendorPerformance = async (req, res, next) => {
  try {
    const metrics = await models.vendors.findAll({
      attributes: ['id', 'name'],
      include: [
        {
          model: models.orders,
          as: 'orders',
          attributes: [
            [fn('COUNT', col('id')), 'totalOrders'],
            [fn('SUM', col('order_value')), 'totalRevenue']
          ]
        }
      ]
    });

    res.json(metrics);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/revenue
 * Returns revenue grouped by day/week/month
 */
exports.getRevenueReports = async (req, res, next) => {
  try {
    const revenue = await models.orders.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', col('order_value')), 'totalRevenue']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    res.json(revenue);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/commissions
 * Returns commission reports (placeholder)
 */
exports.getCommissionReports = async (req, res, next) => {
  try {
    // Example: assume 5% commission per order
    const commissions = await models.orders.findAll({
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('SUM', literal('order_value * 0.05')), 'totalCommission']
      ],
      group: ['date'],
      order: [['date', 'ASC']]
    });

    res.json(commissions);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /analytics/reports/generate
 * Generate custom report (dynamic query placeholder)
 */
exports.generateCustomReport = async (req, res, next) => {
  try {
    const { model, groupBy, aggregate } = req.body;
    if (!models[model]) return res.status(400).json({ error: 'Invalid model' });

    const report = await models[model].findAll({
      attributes: [
        groupBy,
        [fn(aggregate.fn, col(aggregate.field)), aggregate.alias]
      ],
      group: [groupBy]
    });

    res.json(report);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /analytics/reports/:reportId
 * Fetch generated report (placeholder)
 */
exports.getReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    // Placeholder: implement your report storage/fetch logic
    res.json({ message: `Report ${reportId} retrieval not implemented yet.` });
  } catch (err) {
    next(err);
  }
};
