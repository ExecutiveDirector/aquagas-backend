const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const models = initModels(sequelize);
const jwt = require('jsonwebtoken');

// -------------------- Admin Authentication --------------------
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const admin = await models.auth_accounts.findOne({
      where: { email, role: "admin" },
      include: [
        {
          model: models.admin_users,
          as: "admin_user"
        }
      ]
    });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const isSuperAdmin = admin.admin_user?.admin_role === "super_admin";

    const token = jwt.sign(
      {
        id: admin.account_id,
        role: "admin",
        admin_role: admin.admin_user?.admin_role || "admin",
        full_access: isSuperAdmin ? true : false
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    admin.last_login_at = new Date();
    await admin.save();

    res.json({
      message: "Login successful",
      token,
      role: "admin",
      admin_role: admin.admin_user?.admin_role || "admin",
      full_access: isSuperAdmin ? true : false
    });
  } catch (err) {
    next(err);
  }
};

// -------------------- Dashboard --------------------
exports.getDashboard = async (req, res, next) => {
  try {
    const [users, orders, riders, vendors] = await Promise.all([
      models.users.count(),
      models.orders.count(),
      models.riders.count(),
      models.vendors.count()
    ]);

    let todayRevenue = 0;
    if (models.transactions) {
      const { fn, col } = sequelize;
      const result = await models.transactions.findOne({
        attributes: [[fn('SUM', col('amount')), 'total']],
        where: sequelize.where(
          fn('DATE', col('created_at')),
          new Date().toISOString().slice(0, 10)
        ),
        raw: true
      });
      todayRevenue = result?.total || 0;
    }

    res.json({ 
      data: { users, vendors, riders, orders, todayRevenue },
      message: 'Dashboard stats retrieved successfully'
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    next(err);
  }
};

// -------------------- User Management --------------------
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await models.users.findAll({
      include: [
        {
          model: models.auth_accounts,
          as: 'account',
          attributes: [
            'account_id',
            'email',
            'phone_number',
            'role',
            'is_active',
            'last_login_at'
          ]
        },
        {
          model: models.user_wallets,
          as: 'user_wallet',
          attributes: ['wallet_id', 'balance']
        }
      ]
    });

    const formatted = users.map(user => ({
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      role: user.account?.role || 'user',
      email: user.account?.email,
      last_login: user.account?.last_login_at,
      status: user.account?.is_active ? 'active' : 'inactive',
      wallet_balance: user.user_wallet?.balance || 0
    }));

    res.json({ data: formatted });
  } catch (err) {
    console.error("Error fetching users:", err);
    next(err);
  }
};

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phone_number, password, role, status } = req.body;
    console.log("CreateUser request body:", req.body);

    if (!fullName) return res.status(400).json({ error: "Full name is required" });
    if (!email && !phone_number) return res.status(400).json({ error: "Either email or phone number is required" });
    if (!password) return res.status(400).json({ error: "Password is required" });
    if (!role) return res.status(400).json({ error: "Role is required" });

    const validRoles = ['admin', 'rider', 'vendor', 'customer'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }

    const nameParts = fullName.trim().split(/\s+/);
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(' ') || first_name;

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await models.auth_accounts.sequelize.transaction(async (t) => {
      const account = await models.auth_accounts.create(
        {
          email,
          phone_number,
          password_hash: hashedPassword,
          role: role.toLowerCase(),
          is_active: status && status.toLowerCase() === 'inactive' ? 0 : 1
        },
        { transaction: t }
      );

      console.log("Created auth_account:", account.toJSON());

      const user = await models.users.create(
        {
          account_id: account.account_id,
          first_name,
          last_name,
          phone_number: phone_number || null,
          referral_code: `REF${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        },
        { transaction: t }
      );

      console.log("Created user:", user.toJSON());

      if (role.toLowerCase() === 'admin') {
        await models.admin_users.create(
          {
            account_id: account.account_id,
            first_name,
            last_name,
          },
          { transaction: t }
        );
        console.log("Created admin_user for account:", account.account_id);
      }

      return { account, user };
    });

    return res.status(201).json({
      message: "User created successfully",
      data: {
        id: result.account.account_id.toString(),
        fullName,
        email: result.account.email,
        phone_number: result.user.phone_number,
        role: result.account.role,
        status: result.account.is_active ? 'active' : 'inactive',
        walletBalance: 0,
        lastLogin: null,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Email or phone number already exists',
        fields: err.errors.map((e) => e.path),
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { fullName, email, phone_number, role, status, password } = req.body;

    const account = await models.auth_accounts.findByPk(userId);
    if (!account) return res.status(404).json({ error: 'User not found' });

    const validRoles = ['admin', 'rider', 'vendor', 'customer'];
    if (role && !validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
    }

    let first_name, last_name;
    if (fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      first_name = nameParts[0];
      last_name = nameParts.slice(1).join(' ') || first_name;
    }

    const result = await models.auth_accounts.sequelize.transaction(async (t) => {
      const updates = {
        email: email || account.email,
        phone_number: phone_number || account.phone_number,
        role: role ? role.toLowerCase() : account.role,
        is_active: status ? (status.toLowerCase() === 'inactive' ? 0 : 1) : account.is_active,
      };

      if (password) {
        updates.password_hash = await bcrypt.hash(password, 10);
      }
      await account.update(updates, { transaction: t });

      const user = await models.users.findOne({ where: { account_id: userId }, transaction: t });
      if (user && fullName) {
        await user.update(
          {
            first_name: first_name || user.first_name,
            last_name: last_name || user.last_name,
            phone_number: phone_number || user.phone_number,
          },
          { transaction: t }
        );
      }

      if (role && role.toLowerCase() === 'admin' && account.role !== 'admin') {
        await models.admin_users.create(
          {
            account_id: account.account_id,
            first_name: first_name || user.first_name,
            last_name: last_name || user.last_name,
          },
          { transaction: t }
        );
      }

      return { account, user };
    });

    res.json({
      success: true,
      data: {
        id: result.account.account_id.toString(),
        fullName: fullName || `${result.user.first_name} ${result.user.last_name}`,
        email: result.account.email,
        phone_number: result.user.phone_number,
        role: result.account.role,
        status: result.account.is_active ? 'active' : 'inactive',
        walletBalance: result.user.walletBalance || 0,
        lastLogin: result.account.last_login_at || null,
      },
    });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await models.users.findByPk(req.params.userId, {
      include: [
        {
          model: models.auth_accounts,
          as: 'account',
          attributes: ['account_id', 'email', 'phone_number', 'role', 'is_active', 'last_login_at'],
        },
        {
          model: models.user_wallets,
          as: 'user_wallet',
          attributes: ['balance'],
        }
      ]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.account.account_id,
      fullName: `${user.first_name} ${user.last_name}`,
      email: user.account.email,
      phone_number: user.account.phone_number,
      role: user.account.role,
      status: user.account.is_active ? 'active' : 'inactive',
      walletBalance: user.user_wallet?.balance || 0,
      lastLogin: user.account.last_login_at || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const user = await models.users.findByPk(req.params.userId, {
      include: [{ model: models.auth_accounts, as: 'account' }]
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (status) {
      user.account.is_active = status.toLowerCase() === 'active' ? 1 : 0;
      await user.account.save();
    }

    res.json({
      message: 'User status updated',
      user: {
        id: user.account.account_id,
        fullName: `${user.first_name} ${user.last_name}`,
        email: user.account.email,
        phone_number: user.account.phone_number,
        role: user.account.role,
        status: user.account.is_active ? 'active' : 'inactive',
      }
    });
  } catch (err) {
    next(err);
  }
};

// -------------------- Rider Management --------------------
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
      emergency_contact_phone
    } = req.body;

    // Validate required fields
    if (!full_name || !email || !phone || !vehicle_type) {
      return res.status(400).json({ error: 'Missing required fields: full_name, email, phone, vehicle_type' });
    }

    // Check if email or phone already exists
    const existingAccount = await models.auth_accounts.findOne({
      where: { [Op.or]: [{ email }, { phone_number: phone }] }
    });
    if (existingAccount) {
      return res.status(400).json({ error: 'Email or phone already exists' });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Start transaction
    const result = await models.auth_accounts.sequelize.transaction(async (t) => {
      // Create auth account
      const account = await models.auth_accounts.create(
        {
          email,
          phone_number: phone,
          password_hash: hashedPassword,
          role: 'rider',
          is_active: 0 // Pending approval
        },
        { transaction: t }
      );

      // Split full_name into first_name and last_name
      const nameParts = full_name.trim().split(/\s+/);
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ') || first_name;

      // Create rider
      const rider = await models.riders.create(
        {
          account_id: account.account_id,
          first_name,
          last_name,
          phone,
          vehicle_type,
          vehicle_registration: vehicle_registration || null,
          driving_license_no: driving_license_no || null,
          license_expiry_date: license_expiry_date || null,
          national_id: national_id || null,
          emergency_contact_name: emergency_contact_name || null,
          emergency_contact_phone: emergency_contact_phone || null,
          approved: false,
          current_status: 'pending'
        },
        { transaction: t }
      );

      return { account, rider };
    });

    res.status(201).json({
      data: {
        id: result.rider.rider_id.toString(),
        name: full_name,
        email: result.account.email,
        phone: result.rider.phone,
        status: result.account.is_active ? 'active' : 'pending'
      },
      message: `Rider created successfully. Temporary password: ${tempPassword}`
    });
  } catch (err) {
    console.error('Error creating rider:', err.message, err.stack);
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Email or phone number already exists',
        fields: err.errors.map((e) => e.path)
      });
    }
    res.status(500).json({ error: 'Failed to create rider', details: err.message });
  }
};

exports.getAllRiders = async (req, res, next) => {
  try {
    const riders = await models.riders.findAll({
      include: [
        {
          model: models.auth_accounts,
          as: 'account',
          attributes: ['account_id', 'email', 'phone_number', 'role', 'is_active']
        }
      ]
    });
    res.json({ data: riders });
  } catch (err) {
    console.error('Error fetching riders:', err);
    next(err);
  }
};

exports.approveRider = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.params.riderId);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });

    await models.auth_accounts.sequelize.transaction(async (t) => {
      await rider.update({ approved: true, current_status: 'active' }, { transaction: t });
      await models.auth_accounts.update(
        { is_active: 1 },
        { where: { account_id: rider.account_id }, transaction: t }
      );
    });

    res.json({ message: 'Rider approved', data: rider });
  } catch (err) {
    console.error('Error approving rider:', err);
    next(err);
  }
};

exports.updateRiderStatus = async (req, res, next) => {
  try {
    const rider = await models.riders.findByPk(req.params.riderId);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });

    const { status } = req.body;
    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await rider.update({ current_status: status });
    res.json({ message: 'Rider status updated', data: rider });
  } catch (err) {
    console.error('Error updating rider status:', err);
    next(err);
  }
};

// -------------------- Order Management --------------------
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await models.orders.findAll({ include: [{ all: true }] });
    res.json({ data: orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { status } = req.body;
    await order.update({ order_status: status });
    res.json({ message: 'Order status updated', data: order });
  } catch (err) {
    console.error('Error updating order status:', err);
    next(err);
  }
};

// -------------------- Vendor Management --------------------
exports.getAllVendors = async (req, res, next) => {
  try {
    const vendors = await models.vendors.findAll();
    res.json({ data: vendors });
  } catch (err) {
    console.error('Error fetching vendors:', err);
    next(err);
  }
};

exports.approveVendor = async (req, res, next) => {
  try {
    const vendor = await models.vendors.findByPk(req.params.vendorId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    await vendor.update({ approved: true });
    res.json({ message: 'Vendor approved', data: vendor });
  } catch (err) {
    console.error('Error approving vendor:', err);
    next(err);
  }
};

exports.updateVendorStatus = async (req, res, next) => {
  try {
    const vendor = await models.vendors.findByPk(req.params.vendorId);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const { status } = req.body;
    await vendor.update({ status });
    res.json({ message: 'Vendor status updated', data: vendor });
  } catch (err) {
    console.error('Error updating vendor status:', err);
    next(err);
  }
};

// -------------------- Product Management --------------------
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, vendor_id } = req.body;
    if (!name || !price || !vendor_id) {
      return res.status(400).json({ error: 'Missing required fields: name, price, vendor_id' });
    }
    const product = await models.products.create({
      name,
      description,
      price,
      vendor_id
    });
    res.status(201).json({ message: 'Product created', data: product });
  } catch (err) {
    console.error('Error creating product:', err);
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await models.products.findByPk(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const { name, description, price } = req.body;
    await product.update({ name, description, price });
    res.json({ message: 'Product updated', data: product });
  } catch (err) {
    console.error('Error updating product:', err);
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await models.products.findByPk(req.params.productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Error deleting product:', err);
    next(err);
  }
};

// -------------------- System Settings --------------------
exports.getSystemSettings = async (req, res, next) => {
  try {
    const settings = await models.system_settings.findAll();
    res.json({ data: settings });
  } catch (err) {
    console.error('Error fetching system settings:', err);
    next(err);
  }
};

exports.updateSystemSettings = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const setting = await models.system_settings.findOne({ where: { key } });
    if (setting) {
      await setting.update({ value });
    } else {
      await models.system_settings.create({ key, value });
    }
    res.json({ message: 'System setting updated' });
  } catch (err) {
    console.error('Error updating system settings:', err);
    next(err);
  }
};

// -------------------- Audit Logs --------------------
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await models.audit_logs.findAll({ order: [['created_at', 'DESC']] });
    res.json({ data: logs });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    next(err);
  }
};

// 🟢 Get all categories
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await models.product_categories.findAll({
      order: [['sort_order', 'ASC']],
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
};

// 🟢 Create a new category
exports.createCategory = async (req, res, next) => {
  try {
    const {
      category_name,
      parent_category_id = null,
      description = null,
      icon_url = null,
      sort_order = 0,
      is_active = 1,
    } = req.body;

    if (!category_name) {
      return res.status(400).json({ message: 'category_name is required' });
    }

    const existing = await models.product_categories.findOne({
      where: { category_name },
    });
    if (existing) {
      return res.status(409).json({ message: 'Category name already exists' });
    }

    const newCategory = await models.product_categories.create({
      category_name,
      parent_category_id,
      description,
      icon_url,
      sort_order,
      is_active,
    });

    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory,
    });
  } catch (err) {
    next(err);
  }
};

// 🟡 Update an existing category
exports.updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    const category = await models.product_categories.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.update(updates);
    res.json({ message: 'Category updated successfully', category });
  } catch (err) {
    next(err);
  }
};

// 🔴 Delete a category
exports.deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await models.product_categories.findByPk(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
};
