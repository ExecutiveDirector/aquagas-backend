// const initModels = require('../models/init-models');
// const sequelize = require('../config/db');
// const models = initModels(sequelize);

// const createOrder = async (req, res, next) => {
//   try {
//     const { user_id, total_price, items, outlet_id, delivery_latitude, delivery_longitude, delivery_address } = req.body;
    
//     // Detailed validation with specific error messages
//     const missingFields = [];
//     if (!user_id) missingFields.push('user_id');
//     if (!total_price) missingFields.push('total_price');
//     if (!items) missingFields.push('items');
//     if (!outlet_id) missingFields.push('outlet_id');
//     if (!delivery_latitude) missingFields.push('delivery_latitude');
//     if (!delivery_longitude) missingFields.push('delivery_longitude');
    
//     if (missingFields.length > 0) {
//       return res.status(400).json({ 
//         error: 'Missing required fields',
//         missing_fields: missingFields,
//         received_fields: Object.keys(req.body)
//       });
//     }
    
//     if (!Array.isArray(items)) {
//       return res.status(400).json({ 
//         error: 'items must be an array',
//         received_type: typeof items
//       });
//     }
    
//     if (items.length === 0) {
//       return res.status(400).json({ error: 'items array cannot be empty' });
//     }
    
//     // Validate each item
//     for (let i = 0; i < items.length; i++) {
//       const item = items[i];
//       if (!item.product_id || !item.quantity || !item.unit_price) {
//         return res.status(400).json({ 
//           error: `Invalid item at index ${i}. Required: product_id, quantity, unit_price`,
//           received_item: item
//         });
//       }
//     }
    
//     // Authorization check
//     if (user_id !== req.user.user_id) {
//       return res.status(403).json({ 
//         error: 'Unauthorized',
//         details: 'user_id does not match authenticated user'
//       });
//     }

//     // Verify outlet exists
//     const outlet = await models.vendor_outlets.findByPk(outlet_id);
//     if (!outlet) {
//       return res.status(404).json({ error: 'Outlet not found' });
//     }

//     // Calculate totals
//     const subtotal = items.reduce((sum, item) => 
//       sum + (item.quantity * item.unit_price), 0
//     );

//     // Create order with proper field mapping
//     const order = await models.orders.create({
//       customer_id: user_id,
//       outlet_id,
//       subtotal: subtotal,
//       delivery_fee: 0, // Set this based on your business logic
//       tax_amount: 0,   // Calculate if needed
//       discount_amount: 0,
//       total_amount: total_price, // Use total_amount for database
//       order_status: 'pending',
//       payment_status: 'pending',
//       delivery_latitude,
//       delivery_longitude,
//       delivery_address: delivery_address || null,
//       delivery_type: 'home_delivery',
//       created_at: new Date(),
//     });

//     // Create order items with proper field mapping
//     const orderItems = items.map(item => ({
//       order_id: order.order_id,
//       product_id: item.product_id,
//       product_name: item.product_name || 'Product', // Cache product name
//       quantity: item.quantity,
//       unit_price: item.unit_price,
//       total_price: item.quantity * item.unit_price,
//     }));
    
//     await models.order_items.bulkCreate(orderItems);

//     // Auto-assign rider (with error handling)
//     let assignedRiderId = null;
//     try {
//       const [results] = await sequelize.query(
//         'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id); SELECT @assigned_rider_id AS assigned_rider_id;',
//         { replacements: { orderId: order.order_id } }
//       );
//       assignedRiderId = results[0]?.assigned_rider_id || null;
//     } catch (err) {
//       console.warn('Warning: sp_auto_assign_rider failed, continuing without rider assignment', err.message);
//     }

//     // Calculate loyalty points (with error handling)
//     let pointsEarned = 0;
//     try {
//       const [results] = await sequelize.query(
//         'CALL sp_calculate_loyalty_points(:userId, :orderAmount, @points_earned); SELECT @points_earned AS points_earned;',
//         { replacements: { userId: user_id, orderAmount: total_price } }
//       );
//       pointsEarned = results[0]?.points_earned || 0;
//     } catch (err) {
//       console.warn('Warning: sp_calculate_loyalty_points failed', err.message);
//     }

//     res.status(201).json({ 
//       message: 'Order created successfully', 
//       order: {
//         order_id: order.order_id,
//         order_number: order.order_number,
//         customer_id: order.customer_id,
//         outlet_id: order.outlet_id,
//         total_amount: order.total_amount,
//         order_status: order.order_status,
//         payment_status: order.payment_status,
//         created_at: order.created_at,
//       },
//       assigned_rider_id: assignedRiderId, 
//       points_earned: pointsEarned 
//     });
//   } catch (err) {
//     console.error('Error creating order:', err);
    
//     // Send detailed error info in development
//     if (process.env.NODE_ENV === 'development') {
//       return res.status(500).json({
//         error: 'Internal server error',
//         message: err.message,
//         stack: err.stack
//       });
//     }
    
//     next(err);
//   }
// };

// const getUserOrders = async (req, res, next) => {
//   try {
//     const orders = await models.orders.findAll({
//       where: { customer_id: req.user.user_id },
//       include: [
//         { 
//           model: models.order_items, 
//           as: 'order_items', 
//           include: [{ model: models.products, as: 'product' }] 
//         },
//         { model: models.vendor_outlets, as: 'outlet' },
//       ],
//       order: [['created_at', 'DESC']]
//     });
//     res.json(orders);
//   } catch (err) {
//     console.error('Error fetching user orders:', err);
//     next(err);
//   }
// };

// const getOrderDetails = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId, {
//       include: [
//         { 
//           model: models.order_items, 
//           as: 'order_items', 
//           include: [{ model: models.products, as: 'product' }] 
//         },
//         { model: models.vendor_outlets, as: 'outlet' },
//         { model: models.riders, as: 'rider' },
//       ],
//     });
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     res.json(order);
//   } catch (err) {
//     console.error('Error fetching order details:', err);
//     next(err);
//   }
// };

// const cancelOrder = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (order.order_status !== 'pending') {
//       return res.status(400).json({ 
//         error: 'Order cannot be canceled',
//         current_status: order.order_status
//       });
//     }
    
//     order.order_status = 'cancelled'; // Match DB enum spelling
//     order.updated_at = new Date();
//     await order.save();
    
//     res.json({ message: 'Order canceled successfully' });
//   } catch (err) {
//     console.error('Error canceling order:', err);
//     next(err);
//   }
// };

// const trackOrder = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId, {
//       include: [
//         { model: models.riders, as: 'rider' },
//         { model: models.delivery_assignments, as: 'delivery_assignments' },
//       ],
//     });
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     res.json({
//       order_id: order.order_id,
//       status: order.order_status,
//       rider: order.rider ? { 
//         id: order.rider.rider_id, 
//         name: order.rider.name 
//       } : null,
//       current_location: order.delivery_assignments?.[0]?.current_location || null,
//     });
//   } catch (err) {
//     console.error('Error tracking order:', err);
//     next(err);
//   }
// };

// const getOrderTimeline = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     // Build timeline from order timestamps
//     const timeline = [
//       { status: 'pending', timestamp: order.created_at }
//     ];
    
//     if (order.assigned_at) {
//       timeline.push({ status: 'assigned', timestamp: order.assigned_at });
//     }
//     if (order.dispatched_at) {
//       timeline.push({ status: 'dispatched', timestamp: order.dispatched_at });
//     }
//     if (order.delivered_at) {
//       timeline.push({ status: 'delivered', timestamp: order.delivered_at });
//     }
    
//     res.json(timeline);
//   } catch (err) {
//     console.error('Error fetching order timeline:', err);
//     next(err);
//   }
// };

// const updateOrderItems = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (order.order_status !== 'pending') {
//       return res.status(400).json({ error: 'Order cannot be modified' });
//     }

//     const { items } = req.body;
//     if (!items || !Array.isArray(items)) {
//       return res.status(400).json({ error: 'Items array required' });
//     }

//     // Remove existing items and add new ones
//     await models.order_items.destroy({ where: { order_id: order.order_id } });
    
//     const orderItems = items.map(item => ({
//       order_id: order.order_id,
//       product_id: item.product_id,
//       product_name: item.product_name || 'Product',
//       quantity: item.quantity,
//       unit_price: item.unit_price,
//       total_price: item.quantity * item.unit_price,
//     }));
//     await models.order_items.bulkCreate(orderItems);

//     // Update total price
//     const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
//     order.subtotal = subtotal;
//     order.total_amount = subtotal + order.delivery_fee + order.tax_amount - order.discount_amount;
//     order.updated_at = new Date();
//     await order.save();

//     res.json({ message: 'Order items updated', order });
//   } catch (err) {
//     console.error('Error updating order items:', err);
//     next(err);
//   }
// };

// const updateDeliveryAddress = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (order.order_status !== 'pending') {
//       return res.status(400).json({ error: 'Order cannot be modified' });
//     }

//     const { delivery_latitude, delivery_longitude, delivery_address } = req.body;
//     if (!delivery_latitude || !delivery_longitude) {
//       return res.status(400).json({ error: 'Invalid coordinates' });
//     }

//     order.delivery_latitude = delivery_latitude;
//     order.delivery_longitude = delivery_longitude;
//     if (delivery_address) {
//       order.delivery_address = delivery_address;
//     }
//     order.updated_at = new Date();
//     await order.save();
    
//     res.json({ message: 'Delivery address updated', order });
//   } catch (err) {
//     console.error('Error updating delivery address:', err);
//     next(err);
//   }
// };

// const submitOrderReview = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (order.order_status !== 'delivered') {
//       return res.status(400).json({ error: 'Order must be delivered to review' });
//     }

//     const { overall_rating, comment } = req.body;
//     if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
//       return res.status(400).json({ error: 'Rating must be between 1 and 5' });
//     }

//     const review = await models.reviews.create({
//       order_id: order.order_id,
//       reviewer_type: 'user',
//       reviewer_id: req.user.user_id,
//       reviewee_type: 'order',
//       reviewee_id: order.order_id,
//       overall_rating,
//       comment,
//       created_at: new Date(),
//     });
    
//     res.status(201).json({ message: 'Review submitted', review });
//   } catch (err) {
//     console.error('Error submitting order review:', err);
//     next(err);
//   }
// };

// const rateRider = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (!order.rider_id) {
//       return res.status(400).json({ error: 'No rider assigned' });
//     }

//     const { overall_rating } = req.body;
//     if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
//       return res.status(400).json({ error: 'Rating must be between 1 and 5' });
//     }

//     const review = await models.reviews.create({
//       order_id: order.order_id,
//       reviewer_type: 'user',
//       reviewer_id: req.user.user_id,
//       reviewee_type: 'rider',
//       reviewee_id: order.rider_id,
//       overall_rating,
//       created_at: new Date(),
//     });

//     // Update rider rating in delivery_assignments
//     await models.delivery_assignments.update(
//       { rating_by_customer: overall_rating },
//       { where: { order_id: order.order_id, rider_id: order.rider_id } }
//     );

//     res.json({ message: 'Rider rating submitted', review });
//   } catch (err) {
//     console.error('Error rating rider:', err);
//     next(err);
//   }
// };

// const repeatOrder = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId, {
//       include: [{ model: models.order_items, as: 'order_items' }],
//     });
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }

//     const newOrder = await models.orders.create({
//       customer_id: req.user.user_id,
//       outlet_id: order.outlet_id,
//       subtotal: order.subtotal,
//       delivery_fee: order.delivery_fee,
//       tax_amount: order.tax_amount,
//       total_amount: order.total_amount,
//       delivery_latitude: order.delivery_latitude,
//       delivery_longitude: order.delivery_longitude,
//       delivery_address: order.delivery_address,
//       order_status: 'pending',
//       payment_status: 'pending',
//       created_at: new Date(),
//     });

//     const orderItems = order.order_items.map(item => ({
//       order_id: newOrder.order_id,
//       product_id: item.product_id,
//       product_name: item.product_name,
//       quantity: item.quantity,
//       unit_price: item.unit_price,
//       total_price: item.total_price,
//     }));
//     await models.order_items.bulkCreate(orderItems);

//     // Auto-assign rider
//     let assignedRiderId = null;
//     try {
//       const [results] = await sequelize.query(
//         'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id); SELECT @assigned_rider_id AS assigned_rider_id;',
//         { replacements: { orderId: newOrder.order_id } }
//       );
//       assignedRiderId = results[0]?.assigned_rider_id || null;
//     } catch (err) {
//       console.warn('Warning: sp_auto_assign_rider failed, continuing without rider assignment', err.message);
//     }

//     res.status(201).json({ 
//       message: 'Order repeated successfully', 
//       order: newOrder, 
//       assigned_rider_id: assignedRiderId 
//     });
//   } catch (err) {
//     console.error('Error repeating order:', err);
//     next(err);
//   }
// };

// const getDeliverySlots = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     // TODO: Implement delivery slot logic based on vendor_outlets availability
//     res.json([]);
//   } catch (err) {
//     console.error('Error fetching delivery slots:', err);
//     next(err);
//   }
// };

// const updateDeliverySlot = async (req, res, next) => {
//   try {
//     const order = await models.orders.findByPk(req.params.orderId);
    
//     if (!order) {
//       return res.status(404).json({ error: 'Order not found' });
//     }
    
//     if (order.customer_id !== req.user.user_id) {
//       return res.status(403).json({ error: 'Unauthorized' });
//     }
    
//     if (order.order_status !== 'pending') {
//       return res.status(400).json({ error: 'Order cannot be modified' });
//     }

//     const { delivery_slot_start, delivery_slot_end } = req.body;
//     order.delivery_slot_start = delivery_slot_start;
//     order.delivery_slot_end = delivery_slot_end;
//     order.updated_at = new Date();
//     await order.save();
    
//     res.json({ message: 'Delivery slot updated', order });
//   } catch (err) {
//     console.error('Error updating delivery slot:', err);
//     next(err);
//   }
// };

// module.exports = {
//   createOrder,
//   getUserOrders,
//   getOrderDetails,
//   cancelOrder,
//   trackOrder,
//   getOrderTimeline,
//   updateOrderItems,
//   updateDeliveryAddress,
//   submitOrderReview,
//   rateRider,
//   repeatOrder,
//   getDeliverySlots,
//   updateDeliverySlot
// };

// controllers/orderController.js
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const { Op } = require('sequelize');

const isDevelopment = process.env.NODE_ENV !== 'production';

// =========================================================================
// CREATE ORDER
// =========================================================================
exports.createOrder = async (req, res) => {
  const t = await sequelize.transaction();

  try {
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
        has_schedule: !!(scheduled_date && scheduled_time),
      });
    }

    // ✅ Validation
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

    // ✅ For authenticated users, validate user_id
    if (!is_guest && (!user_id || user_id === 'guest')) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'User ID is required for authenticated orders' 
      });
    }

    // ✅ Verify outlet exists and get vendor info
    const outlet = await models.vendor_outlets.findByPk(outlet_id, {
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

    if (isDevelopment) {
      console.log('✅ Outlet verified:', { 
        outlet_id, 
        vendor_id: resolved_vendor_id, 
        vendor_name 
      });
    }

    // ✅ Calculate order totals
    let subtotal = 0;
    const validatedItems = [];

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

      // Get product details (if product_name not provided)
      let productName = product_name;
      if (!productName) {
        const product = await models.products.findByPk(product_id, {
          attributes: ['product_id', 'product_name'],
          transaction: t,
        });

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

    // ✅ Calculate tax and delivery fee
    const tax_amount = parseFloat((subtotal * 0.16).toFixed(2)); // 16% VAT
    const delivery_fee = delivery_address ? 200.00 : 0.00; // KES 200 delivery fee
    const discount_amount = 0.00; // TODO: Apply coupon if provided
    const total_amount = parseFloat(
      (subtotal + tax_amount + delivery_fee - discount_amount).toFixed(2)
    );

    if (isDevelopment) {
      console.log('💰 Order calculations:', {
        subtotal,
        tax_amount,
        delivery_fee,
        discount_amount,
        total_amount,
        client_total: total_price,
      });
    }

    // ✅ Validate total matches (allow small rounding differences)
    const priceDiff = Math.abs(total_amount - parseFloat(total_price));
    if (priceDiff > 0.10) {
      if (isDevelopment) {
        console.warn('⚠️ Price mismatch (proceeding with calculated total):', {
          calculated: total_amount,
          provided: total_price,
          difference: priceDiff,
        });
      }
      // Use calculated total to prevent manipulation
    }

    // ✅ Determine delivery type
    let delivery_type = 'home_delivery';
    if (scheduled_date && scheduled_time) {
      delivery_type = 'scheduled';
      if (isDevelopment) {
        console.log('📅 Scheduled delivery:', { scheduled_date, scheduled_time });
      }
    } else if (!delivery_address) {
      delivery_type = 'pickup';
    }

    // ✅ Calculate estimated delivery time
    let estimated_delivery_time = null;
    if (delivery_type === 'scheduled' && scheduled_date && scheduled_time) {
      // Parse scheduled date and time
      const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}:00`);
      estimated_delivery_time = scheduledDateTime;
    } else if (delivery_type === 'home_delivery') {
      // Estimate 45 minutes for immediate delivery
      estimated_delivery_time = new Date(Date.now() + 45 * 60 * 1000);
    }

    // ✅ Create order
    const orderData = {
      customer_id: is_guest ? null : user_id,
      outlet_id,
      vendor_id: resolved_vendor_id,
      vendor_name,
      order_status: 'pending',
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

    if (isDevelopment) {
      console.log('📝 Creating order with data:', orderData);
    }

    const order = await models.orders.create(orderData, { transaction: t });

    if (isDevelopment) {
      console.log('✅ Order created:', {
        order_id: order.order_id,
        order_number: order.order_number,
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

    await models.order_items.bulkCreate(orderItems, { transaction: t });

    if (isDevelopment) {
      console.log(`✅ Created ${orderItems.length} order items`);
    }

    // ✅ Try to auto-assign rider (non-blocking)
    let assigned_rider_id = null;
    if (!is_guest && delivery_type !== 'pickup') {
      try {
        const [results] = await sequelize.query(
          'CALL sp_auto_assign_rider(:orderId, @assigned_rider_id); SELECT @assigned_rider_id AS assigned_rider_id;',
          { 
            replacements: { orderId: order.order_id },
            transaction: t,
          }
        );
        assigned_rider_id = results[0]?.assigned_rider_id || null;
        
        if (assigned_rider_id && isDevelopment) {
          console.log('✅ Rider auto-assigned:', assigned_rider_id);
        }
      } catch (err) {
        console.warn('⚠️ Rider auto-assignment failed:', err.message);
        // Continue without rider assignment
      }
    }

    await t.commit();

    // ✅ Return success response matching Flutter expectations
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
      assigned_rider_id: assigned_rider_id?.toString() || null,
    });
  } catch (err) {
    await t.rollback();
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

    // Handle MySQL trigger errors
    if (err.original?.sqlState === '45000') {
      return res.status(400).json({
        error: 'Validation error',
        details: err.original.sqlMessage || err.message,
      });
    }

    res.status(500).json({
      error: 'Failed to create order',
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }
};

// =========================================================================
// GET ORDER BY ID
// =========================================================================
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (isDevelopment) {
      console.log('📥 Fetching order:', orderId);
    }

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
          attributes: ['user_id', 'first_name', 'last_name', 'phone_number'],
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

    // ✅ Check authorization
    if (req.user) {
      const isOwner = order.customer_id && order.customer_id === req.user.account_id;
      const isAdmin = req.user.role === 'admin';
      const isVendor = req.user.role === 'vendor' && order.vendor_id === req.user.vendor_id;
      const isRider = req.user.role === 'rider' && order.rider_id === req.user.rider_id;

      if (!isOwner && !isAdmin && !isVendor && !isRider) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (isDevelopment) {
      console.log('✅ Order found:', order.order_number);
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

    if (isDevelopment) {
      console.log('📥 Fetching orders for user:', userId);
    }

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

    if (isDevelopment) {
      console.log(`✅ Found ${orders.length} orders`);
    }

    // Format response for Flutter app
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
// UPDATE ORDER STATUS
// =========================================================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { order_status } = req.body;

    if (!order_status) {
      return res.status(400).json({ error: 'Order status is required' });
    }

    const validStatuses = [
      'draft', 'pending', 'confirmed', 'preparing', 
      'ready', 'dispatched', 'delivered', 'canceled', 'refunded'
    ];

    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ 
        error: 'Invalid order status',
        valid_statuses: validStatuses,
      });
    }

    const order = await models.orders.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Update order status
    await order.update({ order_status });

    // Update timestamp fields based on status
    if (order_status === 'dispatched' && !order.dispatched_at) {
      await order.update({ dispatched_at: new Date() });
    } else if (order_status === 'delivered' && !order.delivered_at) {
      await order.update({ 
        delivered_at: new Date(),
        actual_delivery_time: new Date(),
      });
    }

    if (isDevelopment) {
      console.log('✅ Order status updated:', order.order_number, order_status);
    }

    res.json({
      success: true,
      message: 'Order status updated',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
      },
    });
  } catch (err) {
    console.error('❌ Update order status error:', err);
    res.status(500).json({
      error: 'Failed to update order status',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// =========================================================================
// CANCEL ORDER
// =========================================================================
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { cancellation_reason } = req.body;

    const order = await models.orders.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order can be canceled
    if (['delivered', 'canceled', 'refunded'].includes(order.order_status)) {
      return res.status(400).json({
        error: `Cannot cancel order with status: ${order.order_status}`,
      });
    }

    // Check authorization (user can only cancel their own orders)
    if (req.user.role === 'user') {
      if (order.customer_id !== req.user.account_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await order.update({
      order_status: 'canceled',
      admin_note: cancellation_reason || 'Canceled by customer',
    });

    if (isDevelopment) {
      console.log('✅ Order canceled:', order.order_number);
    }

    res.json({
      success: true,
      message: 'Order canceled successfully',
      order: {
        id: order.order_id.toString(),
        order_id: order.order_id.toString(),
        order_number: order.order_number,
        order_status: order.order_status,
      },
    });
  } catch (err) {
    console.error('❌ Cancel order error:', err);
    res.status(500).json({
      error: 'Failed to cancel order',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

module.exports = exports;