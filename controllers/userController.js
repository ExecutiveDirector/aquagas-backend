const bcrypt = require('bcryptjs');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);
const validator = require('validator');
const crypto = require('crypto');
const redis = require('redis');
const { signAccessToken } = require('../utils/encryption');

// Profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await models.users.findByPk(req.user.id, {
      include: [{ model: models.auth_accounts, as: 'account' }]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await models.users.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { first_name, last_name, phone_number } = req.body;
    await user.update({
      first_name: first_name ?? user.first_name,
      last_name: last_name ?? user.last_name,
      phone_number: phone_number ?? user.phone_number
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const account = await models.auth_accounts.findByPk(req.user.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const isMatch = await bcrypt.compare(oldPassword, account.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Old password incorrect' });

    account.password_hash = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const account = await models.auth_accounts.findByPk(req.user.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    await account.destroy();
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Preferences
exports.getPreferences = async (req, res, next) => {
  try {
    const user = await models.users.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.preferences || {});
  } catch (err) {
    next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const user = await models.users.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.preferences = { ...(user.preferences || {}), ...req.body };
    await user.save();

    res.json(user.preferences);
  } catch (err) {
    next(err);
  }
};

// Wallet
exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await models.wallets.findOne({ where: { user_id: req.user.id } });
    res.json(wallet || { balance: 0 });
  } catch (err) {
    next(err);
  }
};

exports.getWalletTransactions = async (req, res, next) => {
  try {
    const txns = await models.wallet_transactions.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(txns);
  } catch (err) {
    next(err);
  }
};

// Orders
exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await models.orders.findAll({
      where: { customer_id: req.user.id }
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
};

exports.getOrderDetails = async (req, res, next) => {
  try {
    const order = await models.orders.findByPk(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// Loyalty
exports.getLoyaltyPoints = async (req, res, next) => {
  try {
    const points = await models.loyalty_points.sum('points', {
      where: { user_id: req.user.id }
    });
    res.json({ points: points || 0 });
  } catch (err) {
    next(err);
  }
};

exports.getLoyaltyHistory = async (req, res, next) => {
  try {
    const history = await models.loyalty_history.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json(history);
  } catch (err) {
    next(err);
  }
};

// Addresses
exports.getAddresses = async (req, res, next) => {
  try {
    const addresses = await models.addresses.findAll({ where: { user_id: req.user.id } });
    res.json(addresses);
  } catch (err) {
    next(err);
  }
};

exports.addAddress = async (req, res, next) => {
  try {
    const address = await models.addresses.create({ ...req.body, user_id: req.user.id });
    res.status(201).json(address);
  } catch (err) {
    next(err);
  }
};

exports.updateAddress = async (req, res, next) => {
  try {
    const address = await models.addresses.findByPk(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found' });

    Object.assign(address, req.body);
    await address.save();
    res.json(address);
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    const address = await models.addresses.findByPk(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found' });

    await address.destroy();
    res.json({ message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
};



// Initialize Redis client for OTP storage
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.connect().catch((err) => console.error('Redis connection error:', err));

// -------------------------
// DEVELOPMENT CONFIG
// -------------------------
const DEVELOPMENT_MODE = process.env.NODE_ENV !== 'production';
const DEFAULT_OTP = '123456';
const OTP_EXPIRY_MINUTES = 10;

// -------------------------
// SEND OTP
// -------------------------
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone || !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Valid phone number is required (E.164 format)' });
    }

    const cleanPhone = phone.trim();

    if (DEVELOPMENT_MODE) {
      console.log('🟡 DEVELOPMENT MODE: Send OTP');
      console.log('📱 Phone:', cleanPhone);
      console.log('🔑 Default OTP:', DEFAULT_OTP);
    }

    // Generate OTP (use default in dev mode)
    const otp = DEVELOPMENT_MODE ? DEFAULT_OTP : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in Redis with expiration
    const otpKey = `otp:${cleanPhone}`;
    await redisClient.setEx(otpKey, OTP_EXPIRY_MINUTES * 60, JSON.stringify({
      otp,
      expiresAt,
      attempts: 0
    }));

    if (DEVELOPMENT_MODE) {
      console.log('✅ OTP stored in Redis:', otpKey);
      console.log('⏰ Expires in:', OTP_EXPIRY_MINUTES, 'minutes');
    } else {
      // TODO: Integrate SMS service (Twilio, Africa's Talking, etc.)
      console.log('📤 Sending OTP via SMS:', otp, 'to', cleanPhone);
    }

    res.json({
      message: 'OTP sent successfully',
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
      ...(DEVELOPMENT_MODE && { debug: { otp: DEFAULT_OTP } })
    });
  } catch (err) {
    console.error('❌ Send OTP error:', err);
    res.status(500).json({
      error: 'Failed to send OTP',
      ...(DEVELOPMENT_MODE && { details: err.message })
    });
  }
};

// -------------------------
// VERIFY OTP
// -------------------------
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validation
    if (!phone || !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }
    if (!otp || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'Valid 6-digit OTP is required' });
    }

    const cleanPhone = phone.trim();
    const otpKey = `otp:${cleanPhone}`;

    if (DEVELOPMENT_MODE) {
      console.log('🟡 DEVELOPMENT MODE: Verify OTP');
      console.log('📱 Phone:', cleanPhone);
      console.log('🔑 Provided OTP:', otp);
    }

    // Get OTP from Redis
    const storedData = await redisClient.get(otpKey);
    
    if (!storedData) {
      return res.status(400).json({ 
        error: 'OTP expired or not found. Please request a new one.' 
      });
    }

    const { otp: storedOTP, expiresAt, attempts } = JSON.parse(storedData);

    // Check expiration
    if (Date.now() > expiresAt) {
      await redisClient.del(otpKey);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Check attempts (max 5)
    if (attempts >= 5) {
      await redisClient.del(otpKey);
      return res.status(429).json({ 
        error: 'Too many failed attempts. Please request a new OTP.' 
      });
    }

    // Verify OTP
    if (otp !== storedOTP) {
      // Increment attempts
      await redisClient.setEx(otpKey, OTP_EXPIRY_MINUTES * 60, JSON.stringify({
        otp: storedOTP,
        expiresAt,
        attempts: attempts + 1
      }));

      return res.status(400).json({ 
        error: 'Invalid OTP. Please try again.',
        attemptsLeft: 5 - (attempts + 1)
      });
    }

    // OTP verified successfully - delete from Redis
    await redisClient.del(otpKey);

    // Check if account exists
    const existingAccount = await models.auth_accounts.findOne({
      where: { phone_number: cleanPhone }
    });

    if (DEVELOPMENT_MODE) {
      console.log('✅ OTP verified successfully');
      console.log('👤 Existing account:', existingAccount ? 'Yes' : 'No');
    }

    res.json({
      verified: true,
      message: 'OTP verified successfully',
      accountExists: !!existingAccount,
      needsRegistration: !existingAccount
    });
  } catch (err) {
    console.error('❌ Verify OTP error:', err);
    res.status(500).json({
      error: 'Failed to verify OTP',
      ...(DEVELOPMENT_MODE && { details: err.message })
    });
  }
};

// -------------------------
// REGISTER WITH PHONE
// -------------------------
exports.registerWithPhone = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { phone, firstName, lastName, email } = req.body;

    if (DEVELOPMENT_MODE) {
      console.log('📝 Phone Registration Attempt:', {
        phone,
        firstName,
        lastName,
        email
      });
    }

    // Validation
    if (!phone || !validator.isMobilePhone(phone, 'any')) {
      await t.rollback();
      return res.status(400).json({ error: 'Valid phone number is required' });
    }
    if (!firstName || !lastName) {
      await t.rollback();
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email ? email.trim().toLowerCase() : null;

    // Validate email if provided
    if (cleanEmail && !validator.isEmail(cleanEmail)) {
      await t.rollback();
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for existing account
    const existingAccount = await models.auth_accounts.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { phone_number: cleanPhone },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      }
    });

    if (existingAccount) {
      await t.rollback();
      return res.status(409).json({ 
        error: 'Phone number or email already registered' 
      });
    }

    // Generate a random password hash (not used for phone auth, but required by schema)
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // Create auth account
    const authAccount = await models.auth_accounts.create({
      role: 'user',
      phone_number: cleanPhone,
      email: cleanEmail,
      password_hash: hashedPassword,
      phone_verified: true, // Already verified via OTP
      email_verified: false,
      is_active: true,
    }, { transaction: t });

    if (DEVELOPMENT_MODE) {
      console.log('✅ Auth account created:', authAccount.account_id);
    }

    // Generate referral code
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create user profile
    const user = await models.users.create({
      user_id: authAccount.account_id,
      account_id: authAccount.account_id,
      first_name: firstName.substring(0, 100),
      last_name: lastName.substring(0, 100),
      phone_number: cleanPhone,
      referral_code: referralCode,
      status: 'active',
    }, { transaction: t });

    if (DEVELOPMENT_MODE) {
      console.log('✅ User profile created:', user.user_id);
    }

    await t.commit();

    // Generate JWT token
    const token = signAccessToken({
      account_id: authAccount.account_id,
      email: authAccount.email,
      phone: authAccount.phone_number,
      role: authAccount.role,
      user_id: user.user_id
    });

    if (DEVELOPMENT_MODE) {
      console.log('✅ User registered successfully via phone');
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      role: 'user',
      redirect: '/user/home',
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: `${user.first_name} ${user.last_name}`,
        phone_number: cleanPhone,
        email: cleanEmail,
        phone_verified: true,
        referral_code: user.referral_code,
      }
    });
  } catch (err) {
    await t.rollback();
    console.error('❌ Phone registration error:', err);
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Phone number or email already registered',
        ...(DEVELOPMENT_MODE && { details: err.errors?.map(e => e.message) })
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      ...(DEVELOPMENT_MODE && { details: err.message, stack: err.stack })
    });
  }
};

// -------------------------
// LOGIN WITH PHONE (Optional - if you want phone login)
// -------------------------
exports.loginWithPhone = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // First verify OTP (reuse verifyOTP logic)
    // Then authenticate user

    if (!phone || !validator.isMobilePhone(phone, 'any')) {
      return res.status(400).json({ error: 'Valid phone number is required' });
    }

    const cleanPhone = phone.trim();
    
    // Find account
    const authAccount = await models.auth_accounts.findOne({
      where: { phone_number: cleanPhone }
    });

    if (!authAccount) {
      return res.status(401).json({ error: 'Account not found' });
    }

    if (!authAccount.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Get user data
    const user = await models.users.findOne({
      where: { account_id: authAccount.account_id }
    });

    // Update last login
    await authAccount.update({
      last_login_at: new Date()
    });

    // Generate token
    const token = signAccessToken({
      account_id: authAccount.account_id,
      email: authAccount.email,
      phone: authAccount.phone_number,
      role: authAccount.role,
      user_id: user?.user_id
    });

    if (DEVELOPMENT_MODE) {
      console.log('✅ Phone login successful:', cleanPhone);
    }

    res.json({
      message: 'Login successful',
      token,
      role: authAccount.role,
      redirect: '/user/home',
      account: {
        account_id: authAccount.account_id,
        phone: authAccount.phone_number,
        email: authAccount.email,
        role: authAccount.role,
        user_id: user?.user_id
      },
      user: user ? user.toJSON() : null
    });
  } catch (err) {
    console.error('❌ Phone login error:', err);
    res.status(500).json({
      error: 'Login failed',
      ...(DEVELOPMENT_MODE && { details: err.message })
    });
  }
};