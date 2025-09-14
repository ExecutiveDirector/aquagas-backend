const bcrypt = require('bcryptjs');
const { signAccessToken } = require('../utils/encryption');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// -------------------------
// Helper: Sign JWT using encryption utils
// -------------------------
const signToken = (account, additionalData = {}) => {
  return signAccessToken({
    account_id: account.account_id,
    email: account.email,
    role: account.role,
    ...additionalData
  });
};

// -------------------------
// Helper: Redirect Path
// -------------------------
const getRedirectPath = (role, adminRole) => {
  if (role === 'admin') {
    return `/admin/${adminRole || 'dashboard'}`;
  }
  const paths = {
    vendor: '/vendor/dashboard',
    rider: '/rider/home',
    user: '/user/home',
  };
  return paths[role] || '/';
};

// -------------------------
// Register User
// -------------------------
exports.registerUser = async (req, res, next) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    // Check if email already exists in auth_accounts
    const existingAuth = await models.auth_accounts.findOne({ where: { email } });
    if (existingAuth) return res.status(400).json({ error: 'Email already exists' });

    // Check if user already exists
    const existingUser = await models.users.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account first
    const authAccount = await models.auth_accounts.create({
      role: 'user',
      email,
      phone_number: phone,
      password_hash: hashedPassword,
    });

    // Create user record with reference to auth account
    const user = await models.users.create({
      account_id: authAccount.account_id,
      full_name: fullName,
      email,
      phone,
    });

    const token = signToken(authAccount, { user_id: user.user_id });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      role: 'user',
      redirect: getRedirectPath('user'),
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone
      },
    });
  } catch (err) {
    console.error('User registration error:', err);
    next(err);
  }
};

// -------------------------
// Register Vendor
// -------------------------
exports.registerVendor = async (req, res, next) => {
  try {
    const { businessName, contactPerson, email, phone, password, location } = req.body;
    if (!businessName || !contactPerson || !email || !password) {
      return res.status(400).json({ 
        error: 'Business name, contact person, email, and password are required' 
      });
    }

    // Check if email already exists in auth_accounts
    const existingAuth = await models.auth_accounts.findOne({ where: { email } });
    if (existingAuth) return res.status(400).json({ error: 'Email already exists' });

    // Check if vendor already exists
    const existingVendor = await models.vendors.findOne({ where: { business_email: email } });
    if (existingVendor) return res.status(400).json({ error: 'Vendor email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account first
    const authAccount = await models.auth_accounts.create({
      role: 'vendor',
      email,
      phone_number: phone,
      password_hash: hashedPassword,
    });

    // Create vendor record with reference to auth account
    const vendor = await models.vendors.create({
      account_id: authAccount.account_id,
      business_name: businessName,
      contact_person: contactPerson,
      business_email: email,
      business_phone: phone,
      // Add location if your vendors table has location fields
    });

    const token = signToken(authAccount, { vendor_id: vendor.vendor_id });

    res.status(201).json({
      message: 'Vendor registered successfully',
      token,
      role: 'vendor',
      redirect: getRedirectPath('vendor'),
      vendor: {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        contact_person: vendor.contact_person,
        business_email: vendor.business_email
      },
    });
  } catch (err) {
    console.error('Vendor registration error:', err);
    next(err);
  }
};

// -------------------------
// Register Rider
// -------------------------
exports.registerRider = async (req, res, next) => {
  try {
    const { name, email, phone, password, vehicleType, vendorId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email already exists in auth_accounts
    const existingAuth = await models.auth_accounts.findOne({ where: { email } });
    if (existingAuth) return res.status(400).json({ error: 'Email already exists' });

    // Check if rider already exists
    const existingRider = await models.riders.findOne({ where: { email } });
    if (existingRider) return res.status(400).json({ error: 'Rider email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account first
    const authAccount = await models.auth_accounts.create({
      role: 'rider',
      email,
      phone_number: phone,
      password_hash: hashedPassword,
    });

    // Create rider record with reference to auth account
    const rider = await models.riders.create({
      account_id: authAccount.account_id,
      full_name: name,
      email,
      phone,
      vehicle_type: vehicleType,
      vendor_id: vendorId || null,
    });

    const token = signToken(authAccount, { rider_id: rider.rider_id });

    res.status(201).json({
      message: 'Rider registered successfully',
      token,
      role: 'rider',
      redirect: getRedirectPath('rider'),
      rider: {
        rider_id: rider.rider_id,
        full_name: rider.full_name,
        email: rider.email,
        vehicle_type: rider.vehicle_type
      },
    });
  } catch (err) {
    console.error('Rider registration error:', err);
    next(err);
  }
};

// -------------------------
// Register Admin (super_admin only)
// -------------------------
exports.registerAdmin = async (req, res, next) => {
  try {
    const { email, password, adminRole } = req.body;
    if (!email || !password || !adminRole) {
      return res.status(400).json({ error: 'Email, password, and admin role are required' });
    }

    // This endpoint should be protected by requireSuperAdmin middleware

    // Check if email already exists in auth_accounts
    const existingAuth = await models.auth_accounts.findOne({ where: { email } });
    if (existingAuth) return res.status(400).json({ error: 'Email already exists' });

    // Check if admin already exists
    const existingAdmin = await models.admin_users.findOne({ where: { email } });
    if (existingAdmin) return res.status(400).json({ error: 'Admin email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account first
    const authAccount = await models.auth_accounts.create({
      role: 'admin',
      email,
      password_hash: hashedPassword,
    });

    // Create admin record with reference to auth account
    const admin = await models.admin_users.create({
      account_id: authAccount.account_id,
      email,
      admin_role: adminRole,
    });

    const token = signToken(authAccount, { 
      admin_id: admin.admin_id,
      admin_role: adminRole 
    });

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      role: 'admin',
      admin_role: adminRole,
      redirect: getRedirectPath('admin', adminRole),
      admin: {
        admin_id: admin.admin_id,
        email: admin.email,
        admin_role: admin.admin_role
      },
    });
  } catch (err) {
    console.error('Admin registration error:', err);
    next(err);
  }
};

// -------------------------
// Login (unified for all roles)
// -------------------------
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find auth account
    const authAccount = await models.auth_accounts.findOne({ where: { email } });
    if (!authAccount) return res.status(404).json({ error: 'Account not found' });

    if (!authAccount.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, authAccount.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Get role-specific data
    let roleData = null;
    let additionalTokenData = {};

    switch (authAccount.role) {
      case 'user':
        roleData = await models.users.findOne({ where: { account_id: authAccount.account_id } });
        if (roleData) additionalTokenData.user_id = roleData.user_id;
        break;
      case 'vendor':
        roleData = await models.vendors.findOne({ where: { account_id: authAccount.account_id } });
        if (roleData) additionalTokenData.vendor_id = roleData.vendor_id;
        break;
      case 'rider':
        roleData = await models.riders.findOne({ where: { account_id: authAccount.account_id } });
        if (roleData) additionalTokenData.rider_id = roleData.rider_id;
        break;
      case 'admin':
        roleData = await models.admin_users.findOne({ where: { account_id: authAccount.account_id } });
        if (roleData) {
          additionalTokenData.admin_id = roleData.admin_id;
          additionalTokenData.admin_role = roleData.admin_role;
        }
        break;
    }

    // Update last login
    await authAccount.update({ 
      last_login_at: new Date(),
      failed_login_attempts: 0 // Reset failed attempts on successful login
    });

    const token = signToken(authAccount, additionalTokenData);

    const safeAccount = {
      account_id: authAccount.account_id,
      email: authAccount.email,
      role: authAccount.role,
      ...additionalTokenData
    };

    res.json({
      message: 'Login successful',
      token,
      role: authAccount.role,
      admin_role: additionalTokenData.admin_role || null,
      redirect: getRedirectPath(authAccount.role, additionalTokenData.admin_role),
      account: safeAccount,
      roleData: roleData ? {
        ...roleData.dataValues,
        password_hash: undefined, // Remove sensitive data
        account_id: undefined
      } : null
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};

// -------------------------
// Logout
// -------------------------
exports.logout = async (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // But we can blacklist tokens if needed (requires redis/database)
  res.json({ message: 'Logged out successfully' });
};

// -------------------------
// Get Current User Profile
// -------------------------
exports.getProfile = async (req, res, next) => {
  try {
    const { account_id, role } = req.user; // From JWT middleware
    
    const authAccount = await models.auth_accounts.findByPk(account_id, {
      attributes: { exclude: ['password_hash'] }
    });
    
    if (!authAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    let roleData = null;
    
    switch (role) {
      case 'user':
        roleData = await models.users.findOne({ where: { account_id } });
        break;
      case 'vendor':
        roleData = await models.vendors.findOne({ where: { account_id } });
        break;
      case 'rider':
        roleData = await models.riders.findOne({ where: { account_id } });
        break;
      case 'admin':
        roleData = await models.admin_users.findOne({ where: { account_id } });
        break;
    }

    res.json({
      account: authAccount,
      profile: roleData,
      role
    });
  } catch (err) {
    console.error('Get profile error:', err);
    next(err);
  }
};

// -------------------------
// Update Profile
// -------------------------
exports.updateProfile = async (req, res, next) => {
  try {
    const { account_id, role } = req.user;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated through this endpoint
    delete updates.password_hash;
    delete updates.account_id;
    delete updates.role;
    delete updates.created_at;

    let updatedProfile = null;
    
    switch (role) {
      case 'user':
        const user = await models.users.findOne({ where: { account_id } });
        if (user) {
          await user.update(updates);
          updatedProfile = user;
        }
        break;
      case 'vendor':
        const vendor = await models.vendors.findOne({ where: { account_id } });
        if (vendor) {
          await vendor.update(updates);
          updatedProfile = vendor;
        }
        break;
      case 'rider':
        const rider = await models.riders.findOne({ where: { account_id } });
        if (rider) {
          await rider.update(updates);
          updatedProfile = rider;
        }
        break;
      case 'admin':
        const admin = await models.admin_users.findOne({ where: { account_id } });
        if (admin) {
          await admin.update(updates);
          updatedProfile = admin;
        }
        break;
    }

    if (!updatedProfile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile
    });
  } catch (err) {
    console.error('Update profile error:', err);
    next(err);
  }
};

// -------------------------
// Change Password
// -------------------------
exports.changePassword = async (req, res, next) => {
  try {
    const { account_id } = req.user;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const authAccount = await models.auth_accounts.findByPk(account_id);
    if (!authAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, authAccount.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await authAccount.update({ password_hash: hashedNewPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    next(err);
  }
};

// -------------------------
// Password Reset Stubs (implement with email service)
// -------------------------
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const authAccount = await models.auth_accounts.findOne({ where: { email } });
    if (!authAccount) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // TODO: Generate reset token and send email
    // const resetToken = crypto.randomBytes(32).toString('hex');
    // await authAccount.update({
    //   password_reset_token: resetToken,
    //   reset_token_expires: new Date(Date.now() + 3600000) // 1 hour
    // });
    // 
    // Send email with reset link containing token

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    // TODO: Implement token verification and password reset
    res.json({ message: 'Password reset functionality to be implemented' });
  } catch (err) {
    console.error('Reset password error:', err);
    next(err);
  }
};

// -------------------------
// Phone Verification Stub
// -------------------------
exports.verifyPhone = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone and verification code are required' });
    }

    // TODO: Implement SMS verification
    res.json({ message: 'Phone verification functionality to be implemented' });
  } catch (err) {
    console.error('Phone verification error:', err);
    next(err);
  }
};