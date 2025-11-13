// ============================================
// controllers/orderController.js - FIXED & ALIGNED
// ============================================

const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const { Op } = require('sequelize');

const isDevelopment = process.env.NODE_ENV !== 'production';

// =========================================================================
// CREATE DRAFT ORDER (New endpoint matching Flutter)
// =========================================================================
exports.createDraftOrder = async (req, res) => {
  let t;
  
  try {
    t = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      timeout: 30000,
    });

    const {
      user_id,
      outlet_id,
      vendor_id,
      items,
      total_price,
      customer_email,
      customer_phone,
      delivery_notes,
      delivery_address,
      delivery_latitude,
      delivery_longitude,
      is_guest = false,
    } = req.body;

    if (isDevelopment) {
      console.log('📦 Draft order creation request:', {
        user_id,
        outlet_id,
        items_count: items?.length,
        total_price,
        is_guest,
      });
    }

    // ✅ Validation - Allow 'guest' string for guest orders
    if (!outlet_id) {
      await t.rollback();
      return res.status(400).json({ error: 'Outlet ID is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!total_price || total_price <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Total price must be greater than 0' });
    }

    // ✅ Fix: Accept 'guest' string or is_guest flag
    const isGuestOrder = is_guest || user_id === 'guest';
    
    if (!isGuestOrder && !user_id) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'User ID is required for authenticated orders' 
      });
    }

    // ✅ Verify outlet exists
    const outlet = await models.vendor_outlets.findByPk(outlet_id, {
      attributes: ['outlet_id', 'vendor_id'],
      include: [{
        model: models.vendors,
        as: 'vendor',
        attributes: ['vendor_id', 'business_name'],
      }],
      transaction: t,
    });

    if (!outlet) {
      await t.rollback();
      return res.status(404).json({ error: 'Outlet not found' });
    }

    const resolved_vendor_id = vendor_id || outlet.vendor_id;
    const vendor_name = outlet.vendor?.business_name || null;

    // ✅ Calculate order totals
    let subtotal = 0;
    const validatedItems = [];

    const productIds = items.map(item => item.product_id).filter(Boolean);
    const products = await models.products.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['product_id', 'product_name'],
      transaction: t,
    });

    const productMap = new Map(products.map(p => [p.product_id, p]));

    for (const item of items) {
      const { product_id, quantity, unit_price, product_name } = item;

      if (!product_id || !quantity || !unit_price) {
        await t.rollback();
        return res.status(400).json({
          error: 'Each item must have product_id, quantity, and unit_price',
        });
      }

      if (quantity <= 0) {
        await t.rollback();
        return res.status(400).json({
          error: `Quantity must be greater than 0 for product ${product_id}`,
        });
      }

      let productName = product_name;
      if (!productName) {
        const product = productMap.get(parseInt(product_id));
        if (!product) {
          await t.rollback();
          return res.status(404).json({
            error: `Product ${product_id} not found`,
          });
        }
        productName = product.product_name;
      }

      const itemTotal = parseFloat((quantity * unit_price).toFixed(2));
      subtotal += itemTotal;

      validatedItems.push({
        product_id: parseInt(product_id),
        product_name: productName,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unit_price),
        total_price: itemTotal,
      });
    }

    // ✅ Calculate fees
    const tax_amount = parseFloat((subtotal * 0.16).toFixed(2));
    const delivery_fee = delivery_address ? 200.00 : 0.00;
    const discount_amount = 0.00;
    const total_amount = parseFloat(
      (subtotal + tax_amount + delivery_fee - discount_amount).toFixed(2)
    );

    // ✅ Determine delivery type
    const delivery_type = delivery_address ? 'home_delivery' : 'pickup';

    // ✅ Calculate estimated delivery time
    const estimated_delivery_time = delivery_type === 'home_delivery' 
      ? new Date(Date.now() + 45 * 60 * 1000)
      : null;

    // ✅ Create draft order - Fix: Handle guest user_id
    const orderData = {
      customer_id: isGuestOrder ? null : user_id,
      outlet_id,
      vendor_id: resolved_vendor_id,
      vendor_name,
      order_status: 'draft',
      payment_status: 'pending',
      payment_method_id: null,
      subtotal,
      tax_amount,
      delivery_fee,
      discount_amount,
      total_amount,
      total_price: total_amount,
      delivery_type,
      delivery_address: delivery_address || null,
      delivery_latitude: delivery_latitude || null,
      delivery_longitude: delivery_longitude || null,
      delivery_contact: customer_phone || null,
      customer_note: delivery_notes || null,
      estimated_delivery_time,
    };

    const order = await models.orders.create(orderData, { transaction: t });

    if (isDevelopment) {
      console.log('✅ Draft order created:', {
        order_id: order.order_id,
        order_number: order.order_number,
        status: order.order_status,
      });
    }

    // ✅ Create order items
    const orderItems = validatedItems.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    await models.order_items.bulkCreate(orderItems, { 
      transaction: t,
      validate: true,
    });

    await t.commit();
    t = null;

    if (isDevelopment) {
      console.log('✅ Draft order committed - ready for payment');
    }

    // ✅ Return response matching Flutter expectations
    res.status(201).json({
      success: true,
      message: 'Draft order created successfully',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        delivery_type: order.delivery_type,
        estimated_delivery_time: order.estimated_delivery_time,
        created_at: order.created_at,
        customer_phone: customer_phone,
        customer_email: customer_email || null,
      },
    });
  } catch (err) {
    if (t) {
      try {
        await t.rollback();
      } catch (rollbackErr) {
        console.error('❌ Rollback error:', rollbackErr);
      }
    }

    console.error('❌ Draft order creation error:', err);

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: err.errors?.map(e => e.message),
      });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: 'Invalid reference',
        details: 'One or more referenced entities do not exist',
      });
    }

    if (err.name === 'SequelizeTimeoutError') {
      return res.status(504).json({
        error: 'Request timeout',
        details: 'The operation took too long to complete. Please try again.',
      });
    }

    res.status(500).json({
      error: 'Failed to create draft order',
      ...(isDevelopment && { 
        details: err.message, 
        type: err.name 
      }),
    });
  }
};

// =========================================================================
// CREATE ORDER (Standard - kept for backward compatibility)
// =========================================================================
exports.createOrder = async (req, res) => {
  let t;
  
  try {
    t = await sequelize.transaction({
      isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      timeout: 30000,
    });

    const {
      user_id,
      outlet_id,
      vendor_id,
      items,
      total_price,
      phone_number,
      notes,
      delivery_notes,
      delivery_address,
      delivery_latitude,
      delivery_longitude,
      scheduled_date,
      scheduled_time,
      payment_method,
      coupon_code,
      is_guest = false,
    } = req.body;

    if (isDevelopment) {
      console.log('📦 Order creation request:', {
        user_id,
        outlet_id,
        items_count: items?.length,
        total_price,
        is_guest,
      });
    }

    // ✅ Fix: Accept 'guest' string or is_guest flag
    const isGuestOrder = is_guest || user_id === 'guest';

    if (!outlet_id) {
      await t.rollback();
      return res.status(400).json({ error: 'Outlet ID is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!total_price || total_price <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Total price must be greater than 0' });
    }

    if (!isGuestOrder && !user_id) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'User ID is required for authenticated orders' 
      });
    }

    // ✅ Verify outlet exists
    const outlet = await models.vendor_outlets.findByPk(outlet_id, {
      attributes: ['outlet_id', 'vendor_id'],
      include: [{
        model: models.vendors,
        as: 'vendor',
        attributes: ['vendor_id', 'business_name'],
      }],
      transaction: t,
    });

    if (!outlet) {
      await t.rollback();
      return res.status(404).json({ error: 'Outlet not found' });
    }

    const resolved_vendor_id = vendor_id || outlet.vendor_id;
    const vendor_name = outlet.vendor?.business_name || null;

    // ✅ Calculate order totals
    let subtotal = 0;
    const validatedItems = [];

    const productIds = items.map(item => item.product_id).filter(Boolean);
    const products = await models.products.findAll({
      where: { product_id: { [Op.in]: productIds } },
      attributes: ['product_id', 'product_name'],
      transaction: t,
    });

    const productMap = new Map(products.map(p => [p.product_id, p]));

    for (const item of items) {
      const { product_id, quantity, unit_price, product_name } = item;

      if (!product_id || !quantity || !unit_price) {
        await t.rollback();
        return res.status(400).json({
          error: 'Each item must have product_id, quantity, and unit_price',
        });
      }

      if (quantity <= 0) {
        await t.rollback();
        return res.status(400).json({
          error: `Quantity must be greater than 0 for product ${product_id}`,
        });
      }

      let productName = product_name;
      if (!productName) {
        const product = productMap.get(parseInt(product_id));
        if (!product) {
          await t.rollback();
          return res.status(404).json({
            error: `Product ${product_id} not found`,
          });
        }
        productName = product.product_name;
      }

      const itemTotal = parseFloat((quantity * unit_price).toFixed(2));
      subtotal += itemTotal;

      validatedItems.push({
        product_id: parseInt(product_id),
        product_name: productName,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unit_price),
        total_price: itemTotal,
      });
    }

    // ✅ Calculate fees
    const tax_amount = parseFloat((subtotal * 0.16).toFixed(2));
    const delivery_fee = delivery_address ? 200.00 : 0.00;
    const discount_amount = 0.00;
    const total_amount = parseFloat(
      (subtotal + tax_amount + delivery_fee - discount_amount).toFixed(2)
    );

    // ✅ Determine delivery type
    let delivery_type = 'home_delivery';
    if (scheduled_date && scheduled_time) {
      delivery_type = 'scheduled';
    } else if (!delivery_address) {
      delivery_type = 'pickup';
    }

    // ✅ Calculate estimated delivery time
    let estimated_delivery_time = null;
    if (delivery_type === 'scheduled' && scheduled_date && scheduled_time) {
      const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);
      estimated_delivery_time = scheduledDateTime;
    } else if (delivery_type === 'home_delivery') {
      estimated_delivery_time = new Date(Date.now() + 45 * 60 * 1000);
    }

    // ✅ Create order - Fix: Handle guest user_id
    const orderData = {
      customer_id: isGuestOrder ? null : user_id,
      outlet_id,
      vendor_id: resolved_vendor_id,
      vendor_name,
      order_status: 'draft',
      payment_status: 'pending',
      payment_method_id: null,
      subtotal,
      tax_amount,
      delivery_fee,
      discount_amount,
      total_amount,
      total_price: total_amount,
      delivery_type,
      delivery_address: delivery_address || null,
      delivery_latitude: delivery_latitude || null,
      delivery_longitude: delivery_longitude || null,
      delivery_contact: phone_number || null,
      customer_note: delivery_notes || notes || null,
      estimated_delivery_time,
    };

    const order = await models.orders.create(orderData, { transaction: t });

    if (isDevelopment) {
      console.log('✅ Order created:', {
        order_id: order.order_id,
        order_number: order.order_number,
        status: order.order_status,
      });
    }

    // ✅ Create order items
    const orderItems = validatedItems.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));

    await models.order_items.bulkCreate(orderItems, { 
      transaction: t,
      validate: true,
    });

    await t.commit();
    t = null;

    if (isDevelopment) {
      console.log('✅ Order committed successfully');
    }

    // ✅ Return response matching Flutter expectations
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        delivery_type: order.delivery_type,
        estimated_delivery_time: order.estimated_delivery_time,
        created_at: order.created_at,
      },
    });
  } catch (err) {
    if (t) {
      try {
        await t.rollback();
      } catch (rollbackErr) {
        console.error('❌ Rollback error:', rollbackErr);
      }
    }

    console.error('❌ Order creation error:', err);

    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: err.errors?.map(e => e.message),
      });
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        error: 'Invalid reference',
        details: 'One or more referenced entities do not exist',
      });
    }

    if (err.name === 'SequelizeTimeoutError') {
      return res.status(504).json({
        error: 'Request timeout',
        details: 'The operation took too long to complete. Please try again.',
      });
    }

    res.status(500).json({
      error: 'Failed to create order',
      ...(isDevelopment && { 
        details: err.message, 
        type: err.name 
      }),
    });
  }
};

// =========================================================================
// CONFIRM ORDER (After Payment Initiation)
// =========================================================================
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      payment_tracking_id, 
      payment_method,
      phone_number,
      email 
    } = req.body;

    if (isDevelopment) {
      console.log('✅ Confirming order:', {
        orderId,
        payment_tracking_id,
        payment_method,
      });
    }

    const order = await models.orders.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order is in draft status
    if (order.order_status !== 'draft') {
      return res.status(400).json({
        error: `Order cannot be confirmed from status: ${order.order_status}`,
      });
    }

    // Update order to pending (payment initiated)
    await order.update({
      order_status: 'pending',
      payment_status: 'pending',
      delivery_contact: phone_number || order.delivery_contact,
      admin_note: payment_tracking_id ? 
        `Payment initiated: ${payment_tracking_id}` : 
        'Payment initiated',
    });

    // Auto-assign rider in background (non-blocking)
    if (order.delivery_type !== 'pickup') {
      autoAssignRiderAsync(order.order_id)
        .then(riderId => {
          if (riderId && isDevelopment) {
            console.log('✅ Rider auto-assigned:', riderId);
          }
        })
        .catch(err => {
          console.warn('⚠️ Background rider assignment failed:', err.message);
        });
    }

    if (isDevelopment) {
      console.log('✅ Order confirmed and moved to pending');
    }

    res.json({
      success: true,
      message: 'Order confirmed successfully',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
      },
    });
  } catch (err) {
    console.error('❌ Order confirmation error:', err);
    res.status(500).json({
      error: 'Failed to confirm order',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// UPDATE PAYMENT STATUS (NEW - Required by Flutter)
// =========================================================================
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      payment_status,
      transaction_id,
      payment_reference 
    } = req.body;

    if (isDevelopment) {
      console.log('💳 Updating payment status:', {
        orderId,
        payment_status,
        transaction_id,
      });
    }

    if (!payment_status) {
      return res.status(400).json({ error: 'Payment status is required' });
    }

    const validStatuses = ['pending', 'paid', 'partially_paid', 'refunded', 'failed'];
    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({ 
        error: 'Invalid payment status',
        valid_statuses: validStatuses,
      });
    }

    const order = await models.orders.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update payment information
    const updateData = {
      payment_status,
    };

    if (transaction_id) {
      updateData.transaction_id = transaction_id;
    }

    if (payment_reference) {
      updateData.payment_reference = payment_reference;
    }

    // ✅ Auto-confirm if payment successful and order is draft
    if (payment_status === 'paid' && order.order_status === 'draft') {
      updateData.order_status = 'pending';
      
      if (isDevelopment) {
        console.log('✅ Auto-confirming draft order due to successful payment');
      }
    }

    await order.update(updateData);

    // Auto-assign rider if order is now pending
    if (updateData.order_status === 'pending' && order.delivery_type !== 'pickup') {
      autoAssignRiderAsync(order.order_id)
        .then(riderId => {
          if (riderId && isDevelopment) {
            console.log('✅ Rider auto-assigned after payment:', riderId);
          }
        })
        .catch(err => {
          console.warn('⚠️ Background rider assignment failed:', err.message);
        });
    }

    if (isDevelopment) {
      console.log('✅ Payment status updated successfully');
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        transaction_id: order.transaction_id,
        payment_reference: order.payment_reference,
      },
    });
  } catch (err) {
    console.error('❌ Update payment status error:', err);
    res.status(500).json({
      error: 'Failed to update payment status',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// CANCEL DRAFT ORDER (If Payment Fails/Cancelled)
// =========================================================================
exports.cancelDraftOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellation_reason } = req.body;

    const order = await models.orders.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Only allow cancelling draft orders
    if (order.order_status !== 'draft') {
      return res.status(400).json({
        error: 'Only draft orders can be cancelled automatically',
      });
    }

    await order.update({
      order_status: 'canceled',
      admin_note: cancellation_reason || 'Payment not completed',
    });

    if (isDevelopment) {
      console.log('✅ Draft order cancelled:', order.order_number);
    }

    res.json({
      success: true,
      message: 'Draft order cancelled',
      order_id: order.order_id.toString(),
    });
  } catch (err) {
    console.error('❌ Cancel draft order error:', err);
    res.status(500).json({
      error: 'Failed to cancel order',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// HELPER: Auto-assign rider (async, non-blocking)
// =========================================================================
async function autoAssignRiderAsync(orderId) {
  try {
    const result = await sequelize.query(
      'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id)',
      { 
        replacements: { orderId },
        timeout: 10000,
      }
    );

    const [output] = await sequelize.query(
      'SELECT @assigned_rider_id AS assigned_rider_id',
      { timeout: 5000 }
    );

    return output[0]?.assigned_rider_id || null;
  } catch (err) {
    console.warn('⚠️ Rider auto-assignment failed:', err.message);
    return null;
  }
}

// =========================================================================
// GET ORDER BY ID
// =========================================================================
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await models.orders.findByPk(orderId, {
      include: [
        {
          model: models.order_items,
          as: 'order_items',
          include: [{
            model: models.products,
            as: 'product',
            attributes: ['product_id', 'product_name', 'image_url'],
          }],
        },
        {
          model: models.users,
          as: 'customer',
          attributes: ['user_id', 'first_name', 'last_name', 'phone_number', 'email'],
        },
        {
          model: models.vendors,
          as: 'vendor',
          attributes: ['vendor_id', 'business_name', 'business_phone'],
        },
        {
          model: models.vendor_outlets,
          as: 'outlet',
          attributes: ['outlet_id', 'outlet_name', 'address', 'latitude', 'longitude'],
        },
        {
          model: models.riders,
          as: 'rider',
          attributes: ['rider_id', 'full_name', 'phone', 'vehicle_type'],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization check
    if (req.user) {
      const isOwner = order.customer_id && order.customer_id === req.user.account_id;
      const isAdmin = req.user.role === 'admin';
      const isVendor = req.user.role === 'vendor' && order.vendor_id === req.user.vendor_id;
      const isRider = req.user.role === 'rider' && order.rider_id === req.user.rider_id;

      if (!isOwner && !isAdmin && !isVendor && !isRider) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json({ 
      order: {
        ...order.toJSON(),
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
      }
    });
  } catch (err) {
    console.error('❌ Get order error:', err);
    res.status(500).json({
      error: 'Failed to fetch order',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// GET USER ORDERS
// =========================================================================
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.account_id;
    const { status, limit = 50, offset = 0 } = req.query;

    const whereClause = { customer_id: userId };
    if (status) {
      whereClause.order_status = status;
    }

    const orders = await models.orders.findAll({
      where: whereClause,
      include: [
        {
          model: models.order_items,
          as: 'order_items',
          attributes: ['item_id', 'product_name', 'quantity', 'unit_price', 'total_price'],
        },
        {
          model: models.vendors,
          as: 'vendor',
          attributes: ['vendor_id', 'business_name'],
        },
        {
          model: models.vendor_outlets,
          as: 'outlet',
          attributes: ['outlet_id', 'outlet_name', 'address'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedOrders = orders.map(order => ({
      ...order.toJSON(),
      id: order.order_id.toString(),
      order_id: order.order_id.toString(),
    }));

    res.json({ 
      orders: formattedOrders, 
      count: formattedOrders.length 
    });
  } catch (err) {
    console.error('❌ Get user orders error:', err);
    res.status(500).json({
      error: 'Failed to fetch orders',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// GET ALL ORDERS (Admin/Vendor)
// =========================================================================
exports.getAllOrders = async (req, res) => {
  try {
    const { status, vendor_id, limit = 100, offset = 0 } = req.query;

    const whereClause = {};

    // Filter by status if provided
    if (status) {
      whereClause.order_status = status;
    }

    // Vendor users can only see their own orders
    if (req.user.role === 'vendor') {
      whereClause.vendor_id = req.user.vendor_id;
    } else if (vendor_id) {
      // Admin can filter by vendor_id
      whereClause.vendor_id = vendor_id;
    }

    const orders = await models.orders.findAll({
      where: whereClause,
      include: [
        {
          model: models.order_items,
          as: 'order_items',
          attributes: ['item_id', 'product_name', 'quantity', 'unit_price', 'total_price'],
        },
        {
          model: models.users,
          as: 'customer',
          attributes: ['user_id', 'first_name', 'last_name', 'phone_number', 'email'],
        },
        {
          model: models.vendors,
          as: 'vendor',
          attributes: ['vendor_id', 'business_name'],
        },
        {
          model: models.vendor_outlets,
          as: 'outlet',
          attributes: ['outlet_id', 'outlet_name', 'address'],
        },
        {
          model: models.riders,
          as: 'rider',
          attributes: ['rider_id', 'full_name', 'phone'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const formattedOrders = orders.map(order => ({
      ...order.toJSON(),
      id: order.order_id.toString(),
      order_id: order.order_id.toString(),
    }));

    res.json({ 
      orders: formattedOrders, 
      count: formattedOrders.length,
      total: formattedOrders.length
    });
  } catch (err) {
    console.error('❌ Get all orders error:', err);
    res.status(500).json({
      error: 'Failed to fetch orders',
      ...(isDevelopment && { details: err.message }),
    });
  }
}