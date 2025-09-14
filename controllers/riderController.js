const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Added for password hashing
const { Op } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const SALT_ROUNDS = 10;

// Helper function to generate random password
const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// Rider Login
exports.riderLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const account = await models.auth_accounts.findOne({
      where: { email, role: 'rider' },
      include: [{ model: models.riders, as: 'rider' }],
    });

    if (!account) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    const isMatch = await bcrypt.compare(password, account.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { rider_id: account.rider.rider_id, role: 'rider' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    account.last_login_at = new Date();
    await account.save();

    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error('Error in rider login:', err);
    next(err);
  }
};

// Rider Registration (Rider self-registration)
exports.riderRegister = async (req, res, next) => {
  try {
    const { name, email, phone_number, password, vehicle_type, vehicle_registration } = req.body;

    if (!name || !email || !phone_number || !password || !vehicle_type) {
      return res.status(400).json({ error: 'Required fields: name, email, phone_number, password, vehicle_type' });
    }

    const existingAccount = await models.auth_accounts.findOne({ where: { email } });
    if (existingAccount) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const account = await models.auth_accounts.create({
      email,
      phone_number,
      password_hash: hashedPassword,
      role: 'rider',
      created_at: new Date(),
    });

    const rider = await models.riders.create({
      account_id: account.account_id,
      name,
      phone: phone_number,
      vehicle_type,
      vehicle_registration,
      current_status: 'offline',
      is_verified: false,
      is_active: true,
      created_at: new Date(),
    });

    res.status(201).json({ message: 'Rider registered', rider });
  } catch (err) {
    console.error('Error in rider registration:', err);
    next(err);
  }
};

// Admin: Create Rider
exports.createRider = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone,
      vehicle_type,
      vehicle_registration,
      driving_license_no,
      license_expiry_date,
      national_id,
      emergency_contact_name,
      emergency_contact_phone,
    } = req.body;

    if (!full_name || !email || !phone || !vehicle_type) {
      return res.status(400).json({ error: 'Required fields: full_name, email, phone, vehicle_type' });
    }

    const existingAccount = await models.auth_accounts.findOne({ where: { email } });
    if (existingAccount) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate random password for admin-created riders
    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const account = await models.auth_accounts.create({
      email,
      phone_number: phone,
      password_hash: hashedPassword,
      role: 'rider',
      created_at: new Date(),
    });

    const rider = await models.riders.create({
      account_id: account.account_id,
      name: full_name,
      phone,
      vehicle_type,
      vehicle_registration,
      driving_license_no,
      license_expiry_date: license_expiry_date || null,
      national_id,
      emergency_contact_name,
      emergency_contact_phone,
      current_status: 'offline',
      is_verified: false,
      is_active: true,
      created_at: new Date(),
    });

    // TODO: Send email with temporary password to rider
    res.status(201).json({ message: 'Rider created successfully', rider });
  } catch (err) {
    console.error('Error in creating rider:', err);
    next(err);
  }
};

// Admin: Approve/Verify Rider
exports.approveRider = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.params.riderId);
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    rider.is_verified = true;
    await rider.save();

    res.json({ message: 'Rider verified successfully', rider });
  } catch (err) {
    console.error('Error approving rider:', err);
    next(err);
  }
};

// Admin: Update Rider Status
exports.updateRiderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['offline', 'available', 'busy', 'on_delivery', 'on_break'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const rider = await models.riders.findByPk(req.params.riderId);
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }

    rider.current_status = status;
    await rider.save();

    res.json({ message: 'Rider status updated', rider });
  } catch (err) {
    console.error('Error updating rider status:', err);
    next(err);
  }
};

// Admin: Reset Rider Password
exports.resetRiderPassword = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.params.riderId, {
      include: [{ model: models.auth_accounts, as: 'auth_account' }],
    });
    if (!rider || !rider.auth_account) {
      return res.status(404).json({ error: 'Rider or associated account not found' });
    }

    const tempPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    rider.auth_account.password_hash = hashedPassword;
    await rider.auth_account.save();

    // TODO: Send email with temporary password to rider
    res.json({ message: 'Password reset initiated. Temporary password sent to rider.' });
  } catch (err) {
    console.error('Error resetting rider password:', err);
    next(err);
  }
};

// Get Rider Assignments
exports.getAssignments = async (req, res, next) => {
  try {
    const assignments = await models.delivery_assignments.findAll({
      where: { rider_id: req.rider.rider_id },
      include: [{ model: models.orders, as: 'order' }],
    });
    res.json({ data: assignments });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    next(err);
  }
};

// Get Rider Profile
exports.getRiderProfile = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.rider.rider_id, {
      include: [{ model: models.auth_accounts, as: 'auth_account', attributes: ['email', 'phone_number'] }],
    });
    if (!rider) {
      return res.status(404).json({ error: 'Rider not found' });
    }
    res.json({ data: rider });
  } catch (err) {
    console.error('Error fetching rider profile:', err);
    next(err);
  }
};

// Update Rider Profile
exports.updateRiderProfile = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.rider.rider_id);
    const account = await models.auth_accounts.findByPk(rider.account_id);
    const { name, phone_number, vehicle_type, vehicle_registration, national_id, emergency_contact_name, emergency_contact_phone } = req.body;

    rider.name = name || rider.name;
    rider.phone = phone_number || rider.phone;
    rider.vehicle_type = vehicle_type || rider.vehicle_type;
    rider.vehicle_registration = vehicle_registration || rider.vehicle_registration;
    rider.national_id = national_id || rider.national_id;
    rider.emergency_contact_name = emergency_contact_name || rider.emergency_contact_name;
    rider.emergency_contact_phone = emergency_contact_phone || rider.emergency_contact_phone;
    await rider.save();

    account.phone_number = phone_number || account.phone_number;
    await account.save();

    res.json({ message: 'Profile updated', data: rider });
  } catch (err) {
    console.error('Error updating rider profile:', err);
    next(err);
  }
};

// Get Rider Earnings
exports.getEarnings = async (req, res, next) => {
  try {
    const earnings = await models.delivery_assignments.findAll({
      where: { rider_id: req.rider.rider_id, assignment_status: 'completed' },
      attributes: [[sequelize.fn('SUM', sequelize.col('rider_earnings')), 'total_earnings']],
    });
    res.json({ data: { total_earnings: earnings[0].dataValues.total_earnings || 0 } });
  } catch (err) {
    console.error('Error fetching earnings:', err);
    next(err);
  }
};

// Update Rider Location
exports.updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }

    await models.rider_locations.update(
      { is_current: false },
      { where: { rider_id: req.rider.rider_id, is_current: true } }
    );

    await models.rider_locations.create({
      rider_id: req.rider.rider_id,
      latitude,
      longitude,
      is_current: true,
      recorded_at: new Date(),
    });

    res.json({ message: 'Location updated' });
  } catch (err) {
    console.error('Error updating rider location:', err);
    next(err);
  }
};

// Get Available Orders
exports.getAvailableOrders = async (req, res, next) => {
  try {
    const availableOrders = await models.orders.findAll({
      where: { order_status: 'pending', rider_id: null },
      include: [{ model: models.vendor_outlets, as: 'outlet' }],
    });
    res.json({ data: availableOrders });
  } catch (err) {
    console.error('Error fetching available orders:', err);
    next(err);
  }
};

// Accept Order
exports.acceptOrder = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.rider_id) {
      return res.status(400).json({ error: 'Order already assigned' });
    }

    order.rider_id = req.rider.rider_id;
    order.order_status = 'assigned';
    await order.save();

    await models.delivery_assignments.update(
      { assignment_status: 'accepted', accepted_at: new Date() },
      { where: { order_id: order.order_id, rider_id: req.rider.rider_id } }
    );

    res.json({ message: 'Order accepted' });
  } catch (err) {
    console.error('Error accepting order:', err);
    next(err);
  }
};

// Decline Order
exports.declineOrder = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.rider_id !== req.rider.rider_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    order.rider_id = null;
    order.order_status = 'pending';
    await order.save();

    await models.delivery_assignments.update(
      { assignment_status: 'rejected' },
      { where: { order_id: order.order_id, rider_id: req.rider.rider_id } }
    );

    res.json({ message: 'Order declined' });
  } catch (err) {
    console.error('Error declining order:', err);
    next(err);
  }
};

// Confirm Pickup
exports.confirmPickup = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.rider_id !== req.rider.rider_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (order.order_status !== 'assigned') {
      return res.status(400).json({ error: 'Order not ready for pickup' });
    }

    order.order_status = 'picked_up';
    order.updated_at = new Date();
    await order.save();

    await models.delivery_assignments.update(
      { pickup_time: new Date() },
      { where: { order_id: order.order_id, rider_id: req.rider.rider_id } }
    );

    res.json({ message: 'Pickup confirmed' });
  } catch (err) {
    console.error('Error confirming pickup:', err);
    next(err);
  }
};

// Confirm Delivery
exports.confirmDelivery = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.rider_id !== req.rider.rider_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (order.order_status !== 'picked_up') {
      return res.status(400).json({ error: 'Order not ready for delivery' });
    }

    order.order_status = 'delivered';
    order.updated_at = new Date();
    await order.save();

    await models.delivery_assignments.update(
      { assignment_status: 'completed', delivered_at: new Date() },
      { where: { order_id: order.order_id, rider_id: req.rider.rider_id } }
    );

    const rider = await models.riders.findByPk(req.rider.rider_id);
    rider.current_status = 'available';
    await rider.save();

    res.json({ message: 'Delivery confirmed' });
  } catch (err) {
    console.error('Error confirming delivery:', err);
    next(err);
  }
};

// Upload Delivery Photo
exports.uploadDeliveryPhoto = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.rider_id !== req.rider.rider_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { photo_url } = req.body;
    if (!photo_url) {
      return res.status(400).json({ error: 'Photo URL required' });
    }

    // Assuming delivery_assignments has a photo_url column or a related delivery_photos table
    await models.delivery_assignments.update(
      { photo_url },
      { where: { order_id: order.order_id, rider_id: req.rider.rider_id } }
    );

    res.json({ message: 'Photo uploaded' });
  } catch (err) {
    console.error('Error uploading delivery photo:', err);
    next(err);
  }
};

// Get Rider Analytics
exports.getRiderAnalytics = async (req, res, next) => {
  try {
    const analytics = await models.rider_analytics.findAll({
      where: { rider_id: req.rider.rider_id },
    });
    res.json({ data: analytics });
  } catch (err) {
    console.error('Error fetching rider analytics:', err);
    next(err);
  }
};

// Get Rider Ratings
exports.getRatings = async (req, res, next) => {
  try {
    const ratings = await models.delivery_assignments.findAll({
      where: { rider_id: req.rider.rider_id, rating_by_customer: { [Op.ne]: null } },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating_by_customer')), 'avg_rating']],
    });
    res.json({ data: { avg_rating: ratings[0].dataValues.avg_rating || 0 } });
  } catch (err) {
    console.error('Error fetching rider ratings:', err);
    next(err);
  }
};

// Get Optimized Route
exports.getOptimizedRoute = async (req, res, next) => {
  try {
    const assignments = await models.delivery_assignments.findAll({
      where: { rider_id: req.rider.rider_id, assignment_status: ['accepted', 'picked_up'] },
      include: [{ model: models.orders, as: 'order' }],
    });
    // TODO: Implement actual route optimization logic using delivery_routes table
    res.json({
      data: assignments.map(a => ({
        order_id: a.order_id,
        pickup: a.order.pickup_location || 'N/A',
        destination: a.order.delivery_location || 'N/A',
      })),
    });
  } catch (err) {
    console.error('Error fetching optimized route:', err);
    next(err);
  }
};

// Get All Riders (Admin)
// Get All Riders (Admin)
exports.getRiders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    const where = search
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${search}%` } },
            { phone: { [Op.like]: `%${search}%` } },
            { '$auth_account.email$': { [Op.like]: `%${search}%` } },
            { national_id: { [Op.like]: `%${search}%` } },
            { vehicle_registration: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    const riders = await models.riders.findAndCountAll({
      where,
      include: [
        { model: models.auth_accounts, as: 'auth_account', attributes: ['email', 'phone_number'] },
        { model: models.delivery_assignments, as: 'delivery_assignments' },
      ],
      limit,
      offset,
    });

    res.json({
      data: riders.rows,
      total: riders.count,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching riders:', err);
    next(err);
  }
};