const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

const createOrder = async (req, res, next) => {
  try {
    const { user_id, total_price, items, outlet_id, delivery_latitude, delivery_longitude, delivery_address } = req.body;
    
    // Detailed validation with specific error messages
    const missingFields = [];
    if (!user_id) missingFields.push('user_id');
    if (!total_price) missingFields.push('total_price');
    if (!items) missingFields.push('items');
    if (!outlet_id) missingFields.push('outlet_id');
    if (!delivery_latitude) missingFields.push('delivery_latitude');
    if (!delivery_longitude) missingFields.push('delivery_longitude');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing_fields: missingFields,
        received_fields: Object.keys(req.body)
      });
    }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        error: 'items must be an array',
        received_type: typeof items
      });
    }
    
    if (items.length === 0) {
      return res.status(400).json({ error: 'items array cannot be empty' });
    }
    
    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.product_id || !item.quantity || !item.unit_price) {
        return res.status(400).json({ 
          error: `Invalid item at index ${i}. Required: product_id, quantity, unit_price`,
          received_item: item
        });
      }
    }
    
    // Authorization check
    if (user_id !== req.user.user_id) {
      return res.status(403).json({ 
        error: 'Unauthorized',
        details: 'user_id does not match authenticated user'
      });
    }

    // Verify outlet exists
    const outlet = await models.vendor_outlets.findByPk(outlet_id);
    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => 
      sum + (item.quantity * item.unit_price), 0
    );

    // Create order with proper field mapping
    const order = await models.orders.create({
      customer_id: user_id,
      outlet_id,
      subtotal: subtotal,
      delivery_fee: 0, // Set this based on your business logic
      tax_amount: 0,   // Calculate if needed
      discount_amount: 0,
      total_amount: total_price, // Use total_amount for database
      order_status: 'pending',
      payment_status: 'pending',
      delivery_latitude,
      delivery_longitude,
      delivery_address: delivery_address || null,
      delivery_type: 'home_delivery',
      created_at: new Date(),
    });

    // Create order items with proper field mapping
    const orderItems = items.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      product_name: item.product_name || 'Product', // Cache product name
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));
    
    await models.order_items.bulkCreate(orderItems);

    // Auto-assign rider (with error handling)
    let assignedRiderId = null;
    try {
      const [results] = await sequelize.query(
        'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id); SELECT @assigned_rider_id AS assigned_rider_id;',
        { replacements: { orderId: order.order_id } }
      );
      assignedRiderId = results[0]?.assigned_rider_id || null;
    } catch (err) {
      console.warn('Warning: sp_auto_assign_rider failed, continuing without rider assignment', err.message);
    }

    // Calculate loyalty points (with error handling)
    let pointsEarned = 0;
    try {
      const [results] = await sequelize.query(
        'CALL sp_calculate_loyalty_points(:userId, :orderAmount, @points_earned); SELECT @points_earned AS points_earned;',
        { replacements: { userId: user_id, orderAmount: total_price } }
      );
      pointsEarned = results[0]?.points_earned || 0;
    } catch (err) {
      console.warn('Warning: sp_calculate_loyalty_points failed', err.message);
    }

    res.status(201).json({ 
      message: 'Order created successfully', 
      order: {
        order_id: order.order_id,
        order_number: order.order_number,
        customer_id: order.customer_id,
        outlet_id: order.outlet_id,
        total_amount: order.total_amount,
        order_status: order.order_status,
        payment_status: order.payment_status,
        created_at: order.created_at,
      },
      assigned_rider_id: assignedRiderId, 
      points_earned: pointsEarned 
    });
  } catch (err) {
    console.error('Error creating order:', err);
    
    // Send detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      return res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: err.stack
      });
    }
    
    next(err);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    const orders = await models.orders.findAll({
      where: { customer_id: req.user.user_id },
      include: [
        { 
          model: models.order_items, 
          as: 'order_items', 
          include: [{ model: models.products, as: 'product' }] 
        },
        { model: models.vendor_outlets, as: 'outlet' },
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    next(err);
  }
};

const getOrderDetails = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId, {
      include: [
        { 
          model: models.order_items, 
          as: 'order_items', 
          include: [{ model: models.products, as: 'product' }] 
        },
        { model: models.vendor_outlets, as: 'outlet' },
        { model: models.riders, as: 'rider' },
      ],
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(order);
  } catch (err) {
    console.error('Error fetching order details:', err);
    next(err);
  }
};

const cancelOrder = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (order.order_status !== 'pending') {
      return res.status(400).json({ 
        error: 'Order cannot be canceled',
        current_status: order.order_status
      });
    }
    
    order.order_status = 'cancelled'; // Match DB enum spelling
    order.updated_at = new Date();
    await order.save();
    
    res.json({ message: 'Order canceled successfully' });
  } catch (err) {
    console.error('Error canceling order:', err);
    next(err);
  }
};

const trackOrder = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId, {
      include: [
        { model: models.riders, as: 'rider' },
        { model: models.delivery_assignments, as: 'delivery_assignments' },
      ],
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json({
      order_id: order.order_id,
      status: order.order_status,
      rider: order.rider ? { 
        id: order.rider.rider_id, 
        name: order.rider.name 
      } : null,
      current_location: order.delivery_assignments?.[0]?.current_location || null,
    });
  } catch (err) {
    console.error('Error tracking order:', err);
    next(err);
  }
};

const getOrderTimeline = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Build timeline from order timestamps
    const timeline = [
      { status: 'pending', timestamp: order.created_at }
    ];
    
    if (order.assigned_at) {
      timeline.push({ status: 'assigned', timestamp: order.assigned_at });
    }
    if (order.dispatched_at) {
      timeline.push({ status: 'dispatched', timestamp: order.dispatched_at });
    }
    if (order.delivered_at) {
      timeline.push({ status: 'delivered', timestamp: order.delivered_at });
    }
    
    res.json(timeline);
  } catch (err) {
    console.error('Error fetching order timeline:', err);
    next(err);
  }
};

const updateOrderItems = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (order.order_status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be modified' });
    }

    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array required' });
    }

    // Remove existing items and add new ones
    await models.order_items.destroy({ where: { order_id: order.order_id } });
    
    const orderItems = items.map(item => ({
      order_id: order.order_id,
      product_id: item.product_id,
      product_name: item.product_name || 'Product',
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price,
    }));
    await models.order_items.bulkCreate(orderItems);

    // Update total price
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    order.subtotal = subtotal;
    order.total_amount = subtotal + order.delivery_fee + order.tax_amount - order.discount_amount;
    order.updated_at = new Date();
    await order.save();

    res.json({ message: 'Order items updated', order });
  } catch (err) {
    console.error('Error updating order items:', err);
    next(err);
  }
};

const updateDeliveryAddress = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (order.order_status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be modified' });
    }

    const { delivery_latitude, delivery_longitude, delivery_address } = req.body;
    if (!delivery_latitude || !delivery_longitude) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    order.delivery_latitude = delivery_latitude;
    order.delivery_longitude = delivery_longitude;
    if (delivery_address) {
      order.delivery_address = delivery_address;
    }
    order.updated_at = new Date();
    await order.save();
    
    res.json({ message: 'Delivery address updated', order });
  } catch (err) {
    console.error('Error updating delivery address:', err);
    next(err);
  }
};

const submitOrderReview = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (order.order_status !== 'delivered') {
      return res.status(400).json({ error: 'Order must be delivered to review' });
    }

    const { overall_rating, comment } = req.body;
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await models.reviews.create({
      order_id: order.order_id,
      reviewer_type: 'user',
      reviewer_id: req.user.user_id,
      reviewee_type: 'order',
      reviewee_id: order.order_id,
      overall_rating,
      comment,
      created_at: new Date(),
    });
    
    res.status(201).json({ message: 'Review submitted', review });
  } catch (err) {
    console.error('Error submitting order review:', err);
    next(err);
  }
};

const rateRider = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!order.rider_id) {
      return res.status(400).json({ error: 'No rider assigned' });
    }

    const { overall_rating } = req.body;
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await models.reviews.create({
      order_id: order.order_id,
      reviewer_type: 'user',
      reviewer_id: req.user.user_id,
      reviewee_type: 'rider',
      reviewee_id: order.rider_id,
      overall_rating,
      created_at: new Date(),
    });

    // Update rider rating in delivery_assignments
    await models.delivery_assignments.update(
      { rating_by_customer: overall_rating },
      { where: { order_id: order.order_id, rider_id: order.rider_id } }
    );

    res.json({ message: 'Rider rating submitted', review });
  } catch (err) {
    console.error('Error rating rider:', err);
    next(err);
  }
};

const repeatOrder = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId, {
      include: [{ model: models.order_items, as: 'order_items' }],
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const newOrder = await models.orders.create({
      customer_id: req.user.user_id,
      outlet_id: order.outlet_id,
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      tax_amount: order.tax_amount,
      total_amount: order.total_amount,
      delivery_latitude: order.delivery_latitude,
      delivery_longitude: order.delivery_longitude,
      delivery_address: order.delivery_address,
      order_status: 'pending',
      payment_status: 'pending',
      created_at: new Date(),
    });

    const orderItems = order.order_items.map(item => ({
      order_id: newOrder.order_id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
    }));
    await models.order_items.bulkCreate(orderItems);

    // Auto-assign rider
    let assignedRiderId = null;
    try {
      const [results] = await sequelize.query(
        'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id); SELECT @assigned_rider_id AS assigned_rider_id;',
        { replacements: { orderId: newOrder.order_id } }
      );
      assignedRiderId = results[0]?.assigned_rider_id || null;
    } catch (err) {
      console.warn('Warning: sp_auto_assign_rider failed, continuing without rider assignment', err.message);
    }

    res.status(201).json({ 
      message: 'Order repeated successfully', 
      order: newOrder, 
      assigned_rider_id: assignedRiderId 
    });
  } catch (err) {
    console.error('Error repeating order:', err);
    next(err);
  }
};

const getDeliverySlots = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // TODO: Implement delivery slot logic based on vendor_outlets availability
    res.json([]);
  } catch (err) {
    console.error('Error fetching delivery slots:', err);
    next(err);
  }
};

const updateDeliverySlot = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (order.customer_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (order.order_status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be modified' });
    }

    const { delivery_slot_start, delivery_slot_end } = req.body;
    order.delivery_slot_start = delivery_slot_start;
    order.delivery_slot_end = delivery_slot_end;
    order.updated_at = new Date();
    await order.save();
    
    res.json({ message: 'Delivery slot updated', order });
  } catch (err) {
    console.error('Error updating delivery slot:', err);
    next(err);
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderDetails,
  cancelOrder,
  trackOrder,
  getOrderTimeline,
  updateOrderItems,
  updateDeliveryAddress,
  submitOrderReview,
  rateRider,
  repeatOrder,
  getDeliverySlots,
  updateDeliverySlot
};