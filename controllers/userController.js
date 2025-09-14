const bcrypt = require('bcryptjs');
const initModels = require('../models/init-models');
const sequelize = require('../config/db');
const models = initModels(sequelize);

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
