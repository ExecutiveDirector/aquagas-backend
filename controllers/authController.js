const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const redis = require('redis');
const { signAccessToken } = require('../utils/encryption');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

// Initialize Redis client (configure as needed)
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.connect().catch((err) => console.error('Redis connection error:', err));

// -------------------------
// Helper: Sign JWT
// -------------------------
const signToken = (account, additionalData = {}) => {
  return signAccessToken({
    account_id: account.account_id,
    email: account.email,
    role: account.role,
    ...additionalData,
  });
};

// -------------------------
// Helper: Get Redirect Path
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
// Helper: Log Audit Event
// -------------------------
const logAuditEvent = async (accountId, action, details) => {
  try {
    await models.audit_logs.create({
      account_id: accountId,
      action,
      details: { ...details, timestamp: new Date(), ip: details.ip || 'unknown' },
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

// -------------------------
// ENHANCED LOGIN WITH DETAILED DEBUGGING
// -------------------------
exports.login = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { email, password } = req.body;

    // Log attempt in development
    if (isDevelopment) {
      console.log('🔐 Login attempt:', {
        email,
        timestamp: new Date().toISOString(),
        passwordLength: password?.length,
        rawEmail: email,
      });
    }

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // IMPORTANT: Try both normalized and non-normalized email
    const normalizedEmail = validator.normalizeEmail(email);
    const trimmedEmail = email.trim().toLowerCase();

    if (isDevelopment) {
      console.log('📧 Email variants:', {
        original: email,
        normalized: normalizedEmail,
        trimmed: trimmedEmail,
      });
    }

    // Find account with multiple email variants
    let authAccount = await models.auth_accounts.findOne({
      where: { email: normalizedEmail },
    });

    // If not found with normalized, try trimmed lowercase
    if (!authAccount) {
      authAccount = await models.auth_accounts.findOne({
        where: { email: trimmedEmail },
      });
      
      if (isDevelopment && authAccount) {
        console.log('✅ Found account with trimmed email instead of normalized');
      }
    }

    // If still not found, try exact match
    if (!authAccount) {
      authAccount = await models.auth_accounts.findOne({
        where: { email: email.trim() },
      });
      
      if (isDevelopment && authAccount) {
        console.log('✅ Found account with exact email match');
      }
    }

    if (!authAccount) {
      if (isDevelopment) {
        console.log('❌ Account not found for any email variant:', {
          normalized: normalizedEmail,
          trimmed: trimmedEmail,
          original: email.trim(),
        });
        
        // Debug: Show similar emails in database
        const similarAccounts = await models.auth_accounts.findAll({
          where: {
            email: {
              [models.Sequelize.Op.like]: `%${email.split('@')[0]}%`
            }
          },
          attributes: ['email'],
          limit: 5
        });
        console.log('📋 Similar emails in database:', similarAccounts.map(a => a.email));
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (isDevelopment) {
      console.log('✅ Account found:', {
        account_id: authAccount.account_id,
        email: authAccount.email,
        role: authAccount.role,
        is_active: authAccount.is_active,
        hash_length: authAccount.password_hash?.length,
        hash_prefix: authAccount.password_hash?.substring(0, 10),
      });
    }

    // Check account status
    if (!authAccount.is_active) {
      if (isDevelopment) console.log('❌ Account is deactivated:', authAccount.email);
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact support.' 
      });
    }

    // ENHANCED: More flexible password hash validation
    if (!authAccount.password_hash) {
      if (isDevelopment) {
        console.error('❌ Password hash is null/undefined for:', authAccount.email);
      }
      return res.status(500).json({ 
        error: 'Account configuration error. Please contact support.' 
      });
    }

    // Check if hash looks like bcrypt (more lenient check)
    const isBcryptHash = authAccount.password_hash.startsWith('$2') && 
                         authAccount.password_hash.length >= 59;
    
    if (!isBcryptHash) {
      if (isDevelopment) {
        console.error('❌ Invalid password hash format:', {
          email: authAccount.email,
          hash_start: authAccount.password_hash.substring(0, 10),
          hash_length: authAccount.password_hash.length,
        });
      }
      return res.status(500).json({ 
        error: 'Account configuration error. Please contact support.' 
      });
    }

    // Verify password with enhanced error handling
    let isMatch = false;
    try {
      if (isDevelopment) {
        console.log('🔐 Attempting password comparison...');
      }
      
      isMatch = await bcrypt.compare(password, authAccount.password_hash);
      
      if (isDevelopment) {
        console.log('🔐 Password verification result:', {
          isMatch,
          providedPasswordLength: password.length,
          hashLength: authAccount.password_hash.length,
        });
        
        // DEBUGGING: Test hash with known password
        if (!isMatch) {
          console.log('🔍 Testing hash validity...');
          const testHash = await bcrypt.hash(password, 10);
          const testMatch = await bcrypt.compare(password, testHash);
          console.log('🔍 Test hash comparison works:', testMatch);
        }
      }
    } catch (bcryptError) {
      console.error('❌ bcrypt.compare error:', {
        error: bcryptError.message,
        email: authAccount.email,
        hashPrefix: authAccount.password_hash?.substring(0, 15),
      });
      return res.status(500).json({ 
        error: 'Authentication error. Please try again.',
        ...(isDevelopment && { debug: bcryptError.message })
      });
    }

    if (!isMatch) {
      const failedAttempts = (authAccount.failed_login_attempts || 0) + 1;
      await authAccount.update({
        failed_login_attempts: failedAttempts,
        last_failed_login_at: new Date(),
      });

      if (isDevelopment) {
        console.log('❌ Password mismatch for:', {
          email: authAccount.email,
          attempts: failedAttempts,
          providedLength: password.length,
          hashValid: isBcryptHash,
        });
      }

      if (failedAttempts >= 5) {
        await authAccount.update({ is_active: false });
        return res.status(403).json({
          error: 'Account locked due to multiple failed login attempts. Please contact support.',
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        ...(isDevelopment && { 
          debug: { 
            reason: 'password_mismatch', 
            attempts: failedAttempts,
            hint: 'Check if password was hashed correctly during registration'
          } 
        }),
      });
    }

    // Get role-specific data
    let roleData = null;
    let additionalTokenData = {};
    try {
      switch (authAccount.role) {
        case 'user':
          roleData = await models.users.findOne({
            where: { account_id: authAccount.account_id },
            attributes: { exclude: ['created_at', 'updated_at'] },
          });
          if (roleData) additionalTokenData.user_id = roleData.user_id;
          break;
        case 'vendor':
          roleData = await models.vendors.findOne({
            where: { account_id: authAccount.account_id },
            attributes: { exclude: ['created_at', 'updated_at'] },
          });
          if (roleData) additionalTokenData.vendor_id = roleData.vendor_id;
          break;
        case 'rider':
          roleData = await models.riders.findOne({
            where: { account_id: authAccount.account_id },
            attributes: { exclude: ['created_at', 'updated_at'] },
          });
          if (roleData) additionalTokenData.rider_id = roleData.rider_id;
          break;
        case 'admin':
          roleData = await models.admin_users.findOne({
            where: { account_id: authAccount.account_id },
            attributes: { exclude: ['created_at', 'updated_at'] },
          });
          if (roleData) {
            additionalTokenData.admin_id = roleData.admin_id;
            additionalTokenData.admin_role = roleData.admin_role;
          }
          break;
      }
    } catch (roleError) {
      console.error('Error fetching role data:', roleError);
    }

    // Update last login
    await authAccount.update({
      last_login_at: new Date(),
      failed_login_attempts: 0,
      last_failed_login_at: null,
    });

    // Generate token
    const token = signToken(authAccount, additionalTokenData);

    // Log audit event
    await logAuditEvent(authAccount.account_id, 'login', { 
      email: authAccount.email, 
      ip: req.ip 
    });

    // Prepare response
    const response = {
      message: 'Login successful',
      token,
      role: authAccount.role,
      admin_role: additionalTokenData.admin_role || null,
      redirect: getRedirectPath(authAccount.role, additionalTokenData.admin_role),
      account: {
        account_id: authAccount.account_id,
        email: authAccount.email,
        role: authAccount.role,
        ...additionalTokenData,
      },
      roleData: roleData ? roleData.toJSON() : null,
    };

    if (isDevelopment) console.log('✅ Login successful:', authAccount.email);
    res.json(response);
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }
};

// -------------------------
// ADMIN LOGIN
// -------------------------
exports.adminLogin = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const admin = await models.auth_accounts.findOne({
      where: { email: validator.normalizeEmail(email), role: 'admin' },
      include: [{ model: models.admin_users, as: 'admin_user' }],
    });

    if (!admin) {
      if (isDevelopment) console.log('❌ Admin not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      const failedAttempts = (admin.failed_login_attempts || 0) + 1;
      await admin.update({
        failed_login_attempts: failedAttempts,
        last_failed_login_at: new Date(),
      });

      if (failedAttempts >= 5) {
        await admin.update({ is_active: false });
        return res.status(403).json({
          error: 'Account locked due to multiple failed login attempts. Please contact support.',
        });
      }

      return res.status(401).json({
        error: 'Invalid credentials',
        ...(isDevelopment && { debug: { reason: 'password_mismatch', attempts: failedAttempts } }),
      });
    }

    await admin.update({
      last_login_at: new Date(),
      failed_login_attempts: 0,
      last_failed_login_at: null,
    });

    const token = signToken(admin, {
      admin_id: admin.admin_user?.admin_id,
      admin_role: admin.admin_user?.admin_role || 'admin',
    });

    await logAuditEvent(admin.account_id, 'admin_login', { email, ip: req.ip });

    if (isDevelopment) console.log('✅ Admin login successful:', email);

    res.json({
      message: 'Login successful',
      token,
      role: 'admin',
      admin_role: admin.admin_user?.admin_role || 'admin',
      redirect: getRedirectPath('admin', admin.admin_user?.admin_role),
      account: {
        account_id: admin.account_id,
        email: admin.email,
        role: admin.role,
        admin_id: admin.admin_user?.admin_id,
        admin_role: admin.admin_user?.admin_role,
      },
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// REGISTER USER
// -------------------------

exports.registerUser = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const t = await sequelize.transaction();
  try {
    const { fullName, email, phone, password } = req.body;

    if (isDevelopment) {
      console.log('📝 Registration attempt:', {
        fullName,
        email,
        phone,
        passwordLength: password?.length,
      });
    }

    // Validation
    if (!fullName || !email || !password) {
      await t.rollback();
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
    if (!validator.isEmail(email)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      await t.rollback();
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (phone && !validator.isMobilePhone(phone, 'any')) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Normalize email consistently (same as login)
    const cleanEmail = email.trim().toLowerCase();

    if (isDevelopment) {
      console.log('📧 Email processing:', {
        original: email,
        cleaned: cleanEmail,
      });
    }

    // Check for existing account with multiple email formats
    const existingAuth = await models.auth_accounts.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { email: cleanEmail },
          { email: validator.normalizeEmail(email) },
          { email: email.trim() }
        ]
      },
    });

    if (existingAuth) {
      await t.rollback();
      if (isDevelopment) {
        console.log('❌ Email already exists:', existingAuth.email);
      }
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Split full name into first and last name for database schema
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    if (isDevelopment) {
      console.log('👤 Name split:', { firstName, lastName });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDevelopment) {
      console.log('🔐 Password hashed:', {
        length: hashedPassword.length,
        prefix: hashedPassword.substring(0, 10),
      });
    }

    // Create auth account with consistent email format
    const authAccount = await models.auth_accounts.create(
      {
        role: 'user',
        email: cleanEmail, // Use consistent format
        phone_number: phone ? phone.trim() : null,
        password_hash: hashedPassword,
        is_active: true,
      },
      { transaction: t }
    );

    if (isDevelopment) {
      console.log('✅ Auth account created:', {
        account_id: authAccount.account_id,
        email: authAccount.email,
      });
    }

    // Generate referral code
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create user profile with correct schema columns
    const user = await models.users.create(
      {
        user_id: authAccount.account_id, // Use account_id as user_id
        account_id: authAccount.account_id,
        first_name: firstName.substring(0, 100), // Respect VARCHAR(100) limit
        last_name: lastName.substring(0, 100),
        phone_number: phone ? phone.trim() : null,
        referral_code: referralCode,
        status: 'active',
      },
      { transaction: t }
    );

    if (isDevelopment) {
      console.log('✅ User profile created:', {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
      });
    }

    await t.commit();

    // Generate token
    const token = signToken(authAccount, { user_id: user.user_id });

    // Log audit event
    await logAuditEvent(authAccount.account_id, 'register_user', { 
      email: cleanEmail, 
      ip: req.ip 
    });

    if (isDevelopment) {
      console.log('✅ User registered successfully:', cleanEmail);
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      role: 'user',
      redirect: getRedirectPath('user'),
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: fullName,
        email: cleanEmail,
        phone_number: user.phone_number,
        referral_code: user.referral_code,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('❌ User registration error:', err);
    
    // Handle specific Sequelize errors
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Email or phone number already registered',
        ...(isDevelopment && { details: err.errors?.map(e => e.message) }),
      });
    }
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        ...(isDevelopment && { details: err.errors?.map(e => e.message) }),
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }
};

// -------------------------
// REGISTER VENDOR
// -------------------------
exports.registerVendor = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const t = await sequelize.transaction();
  try {
    const { businessName, contactPerson, email, phone, password, location } = req.body;

    // Validation
    if (!businessName || !contactPerson || !email || !password) {
      return res.status(400).json({
        error: 'Business name, contact person, email, and password are required',
      });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (phone && !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check for existing account
    const existingAuth = await models.auth_accounts.findOne({
      where: { email: validator.normalizeEmail(email) },
    });
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account
    const authAccount = await models.auth_accounts.create(
      {
        role: 'vendor',
        email: validator.normalizeEmail(email),
        phone_number: phone ? validator.escape(phone) : null,
        password_hash: hashedPassword,
        is_active: true,
      },
      { transaction: t }
    );

    // Create vendor profile
    const vendor = await models.vendors.create(
      {
        account_id: authAccount.account_id,
        business_name: validator.escape(businessName.trim()),
        contact_person: validator.escape(contactPerson.trim()),
        business_email: validator.normalizeEmail(email),
        business_phone: phone ? validator.escape(phone) : null,
        location: location ? validator.escape(JSON.stringify(location)) : null,
      },
      { transaction: t }
    );

    await t.commit();

    // Generate token
    const token = signToken(authAccount, { vendor_id: vendor.vendor_id });

    // Log audit event
    await logAuditEvent(authAccount.account_id, 'register_vendor', { email, ip: req.ip });

    if (isDevelopment) console.log('✅ Vendor registered:', email);

    res.status(201).json({
      message: 'Vendor registered successfully',
      token,
      role: 'vendor',
      redirect: getRedirectPath('vendor'),
      vendor: {
        vendor_id: vendor.vendor_id,
        business_name: vendor.business_name,
        contact_person: vendor.contact_person,
        business_email: vendor.business_email,
        business_phone: vendor.business_phone,
        location: vendor.location ? JSON.parse(vendor.location) : null,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Vendor registration error:', err);
    res.status(500).json({
      error: 'Registration failed',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// REGISTER RIDER
// -------------------------
exports.registerRider = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const t = await sequelize.transaction();
  try {
    const { name, email, phone, password, vehicleType, vendorId } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (phone && !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    if (vendorId && !(await models.vendors.findByPk(vendorId))) {
      return res.status(400).json({ error: 'Invalid vendor ID' });
    }

    // Check for existing account
    const existingAuth = await models.auth_accounts.findOne({
      where: { email: validator.normalizeEmail(email) },
    });
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account
    const authAccount = await models.auth_accounts.create(
      {
        role: 'rider',
        email: validator.normalizeEmail(email),
        phone_number: phone ? validator.escape(phone) : null,
        password_hash: hashedPassword,
        is_active: true,
      },
      { transaction: t }
    );

    // Create rider profile
    const rider = await models.riders.create(
      {
        account_id: authAccount.account_id,
        full_name: validator.escape(name.trim()),
        email: validator.normalizeEmail(email),
        phone: phone ? validator.escape(phone) : null,
        vehicle_type: vehicleType ? validator.escape(vehicleType.trim()) : null,
        vendor_id: vendorId || null,
      },
      { transaction: t }
    );

    await t.commit();

    // Generate token
    const token = signToken(authAccount, { rider_id: rider.rider_id });

    // Log audit event
    await logAuditEvent(authAccount.account_id, 'register_rider', { email, ip: req.ip });

    if (isDevelopment) console.log('✅ Rider registered:', email);

    res.status(201).json({
      message: 'Rider registered successfully',
      token,
      role: 'rider',
      redirect: getRedirectPath('rider'),
      rider: {
        rider_id: rider.rider_id,
        full_name: rider.full_name,
        email: rider.email,
        vehicle_type: rider.vehicle_type,
        vendor_id: rider.vendor_id,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Rider registration error:', err);
    res.status(500).json({
      error: 'Registration failed',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// REGISTER ADMIN (super_admin only)
// -------------------------
exports.registerAdmin = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const t = await sequelize.transaction();
  try {
    const { email, password, adminRole } = req.body;

    // Validation
    if (!email || !password || !adminRole) {
      return res.status(400).json({ error: 'Email, password, and admin role are required' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check for existing account
    const existingAuth = await models.auth_accounts.findOne({
      where: { email: validator.normalizeEmail(email) },
    });
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account
    const authAccount = await models.auth_accounts.create(
      {
        role: 'admin',
        email: validator.normalizeEmail(email),
        password_hash: hashedPassword,
        is_active: true,
      },
      { transaction: t }
    );

    // Create admin profile
    const admin = await models.admin_users.create(
      {
        account_id: authAccount.account_id,
        email: validator.normalizeEmail(email),
        admin_role: validator.escape(adminRole.trim()),
      },
      { transaction: t }
    );

    await t.commit();

    // Generate token
    const token = signToken(authAccount, {
      admin_id: admin.admin_id,
      admin_role: admin.admin_role,
    });

    // Log audit event
    await logAuditEvent(authAccount.account_id, 'register_admin', { email, adminRole, ip: req.ip });

    if (isDevelopment) console.log('✅ Admin registered:', email);

    res.status(201).json({
      message: 'Admin registered successfully',
      token,
      role: 'admin',
      admin_role: admin.admin_role,
      redirect: getRedirectPath('admin', admin.admin_role),
      admin: {
        admin_id: admin.admin_id,
        email: admin.email,
        admin_role: admin.admin_role,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error('Admin registration error:', err);
    res.status(500).json({
      error: 'Registration failed',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// LOGOUT
// -------------------------
exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Blacklist token with 8-hour expiration (matching JWT)
      await redisClient.setEx(`blacklist:${token}`, 8 * 3600, 'true');
      await logAuditEvent(req.user?.account_id, 'logout', { ip: req.ip });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({
      error: 'Logout failed',
      ...(process.env.NODE_ENV !== 'production' && { details: err.message }),
    });
  }
};

// -------------------------
// GET CURRENT USER PROFILE
// -------------------------
exports.getProfile = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { account_id, role } = req.user;

    const authAccount = await models.auth_accounts.findByPk(account_id, {
      attributes: { exclude: ['password_hash'] },
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

    await logAuditEvent(authAccount.account_id, 'get_profile', { role, ip: req.ip });

    if (isDevelopment) console.log('✅ Profile retrieved:', authAccount.email);

    res.json({
      account: authAccount,
      profile: roleData,
      role,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({
      error: 'Failed to retrieve profile',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// UPDATE PROFILE
// -------------------------
exports.updateProfile = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { account_id, role } = req.user;
    let updates = { ...req.body };

    // Remove sensitive fields
    delete updates.password_hash;
    delete updates.account_id;
    delete updates.role;
    delete updates.created_at;
    delete updates.updated_at;

    // Sanitize inputs
    for (const key in updates) {
      if (typeof updates[key] === 'string') {
        updates[key] = validator.escape(updates[key].trim());
      }
    }
    if (updates.email) {
      if (!validator.isEmail(updates.email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.email = validator.normalizeEmail(updates.email);
    }
    if (updates.phone && !validator.isMobilePhone(updates.phone, 'any')) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

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

    await logAuditEvent(account_id, 'update_profile', { role, ip: req.ip });

    if (isDevelopment) console.log('✅ Profile updated:', updatedProfile.email);

    res.json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      error: 'Failed to update profile',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// CHANGE PASSWORD
// -------------------------
exports.changePassword = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { account_id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const authAccount = await models.auth_accounts.findByPk(account_id);
    if (!authAccount) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, authAccount.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await authAccount.update({ password_hash: hashedNewPassword });

    await logAuditEvent(account_id, 'change_password', { ip: req.ip });

    if (isDevelopment) console.log('✅ Password changed for account:', authAccount.email);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      error: 'Failed to change password',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// FORGOT PASSWORD
// -------------------------
exports.forgotPassword = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const normalizedEmail = validator.normalizeEmail(email);
    const authAccount = await models.auth_accounts.findOne({ where: { email: normalizedEmail } });

    if (!authAccount) {
      if (isDevelopment) console.log('❌ No account found for password reset:', email);
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await authAccount.update({
      password_reset_token: resetToken,
      reset_token_expires: new Date(Date.now() + 3600000), // 1 hour
    });

    // TODO: Integrate with email service (e.g., Nodemailer, SendGrid)
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log('Password reset link:', resetLink); // Replace with email service

    await logAuditEvent(authAccount.account_id, 'forgot_password', { email, ip: req.ip });

    if (isDevelopment) console.log('✅ Password reset initiated:', email);

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      error: 'Failed to process password reset',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// RESET PASSWORD
// -------------------------
exports.resetPassword = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const authAccount = await models.auth_accounts.findOne({
      where: {
        password_reset_token: token,
        reset_token_expires: { [models.Sequelize.Op.gt]: new Date() },
      },
    });

    if (!authAccount) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await authAccount.update({
      password_hash: hashedNewPassword,
      password_reset_token: null,
      reset_token_expires: null,
    });

    await logAuditEvent(authAccount.account_id, 'reset_password', { ip: req.ip });

    if (isDevelopment) console.log('✅ Password reset for:', authAccount.email);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      error: 'Failed to reset password',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// PHONE VERIFICATION
// -------------------------
exports.verifyPhone = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and verification code are required' });
    }
    if (!validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check for existing verification record (assumes a phone_verifications table)
    const verification = await models.phone_verifications.findOne({
      where: {
        phone_number: phone,
        verification_code: code,
        expires_at: { [models.Sequelize.Op.gt]: new Date() },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Update auth account to mark phone as verified
    const authAccount = await models.auth_accounts.findOne({
      where: { phone_number: phone },
    });
    if (authAccount) {
      await authAccount.update({ phone_verified: true });
    }

    // Delete verification record
    await verification.destroy();

    await logAuditEvent(authAccount?.account_id, 'verify_phone', { phone, ip: req.ip });

    if (isDevelopment) console.log('✅ Phone verified:', phone);

    res.json({ message: 'Phone number verified successfully' });
  } catch (err) {
    console.error('Phone verification error:', err);
    res.status(500).json({
      error: 'Failed to verify phone number',
      ...(isDevelopment && { details: err.message }),
    });
  }
};

// -------------------------
// SEND PHONE VERIFICATION CODE
// -------------------------
exports.sendPhoneVerification = async (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  try {
    const { phone } = req.body;

    if (!phone || !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code (assumes phone_verifications table)
    await models.phone_verifications.create({
      phone_number: phone,
      verification_code: code,
      expires_at: expiresAt,
    });

    // TODO: Integrate with SMS service (e.g., Twilio)
    console.log('Phone verification code:', code); // Replace with SMS service

    await logAuditEvent(null, 'send_phone_verification', { phone, ip: req.ip });

    if (isDevelopment) console.log('✅ Verification code sent to:', phone);

    res.json({ message: 'Verification code sent to phone' });
  } catch (err) {
    console.error('Send phone verification error:', err);
    res.status(500).json({
      error: 'Failed to send verification code',
      ...(isDevelopment && { details: err.message }),
    });
  }
};