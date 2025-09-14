var DataTypes = require("sequelize").DataTypes;
var _admin_users = require("./admin_users");
var _audit_logs = require("./audit_logs");
var _auth_accounts = require("./auth_accounts");
var _daily_analytics = require("./daily_analytics");
var _delivery_assignments = require("./delivery_assignments");
var _delivery_routes = require("./delivery_routes");
var _inventory_movements = require("./inventory_movements");
var _iot_devices = require("./iot_devices");
var _job_queue = require("./job_queue");
var _loyalty_point_transactions = require("./loyalty_point_transactions");
var _loyalty_rewards = require("./loyalty_rewards");
var _notification_templates = require("./notification_templates");
var _notifications = require("./notifications");
var _order_items = require("./order_items");
var _orders = require("./orders");
var _payment_methods = require("./payment_methods");
var _product_categories = require("./product_categories");
var _products = require("./products");
var _promotions = require("./promotions");
var _referrals = require("./referrals");
var _reviews = require("./reviews");
var _rider_analytics = require("./rider_analytics");
var _rider_locations = require("./rider_locations");
var _riders = require("./riders");
var _subscription_plans = require("./subscription_plans");
var _support_messages = require("./support_messages");
var _support_tickets = require("./support_tickets");
var _system_events = require("./system_events");
var _system_settings = require("./system_settings");
var _transactions = require("./transactions");
var _user_promotion_usage = require("./user_promotion_usage");
var _user_subscriptions = require("./user_subscriptions");
var _user_wallets = require("./user_wallets");
var _users = require("./users");
var _vendor_analytics = require("./vendor_analytics");
var _vendor_inventory = require("./vendor_inventory");
var _vendor_outlets = require("./vendor_outlets");
var _vendors = require("./vendors");
var _wallet_transactions = require("./wallet_transactions");

function initModels(sequelize) {
  var admin_users = _admin_users(sequelize, DataTypes);
  var audit_logs = _audit_logs(sequelize, DataTypes);
  var auth_accounts = _auth_accounts(sequelize, DataTypes);
  var daily_analytics = _daily_analytics(sequelize, DataTypes);
  var delivery_assignments = _delivery_assignments(sequelize, DataTypes);
  var delivery_routes = _delivery_routes(sequelize, DataTypes);
  var inventory_movements = _inventory_movements(sequelize, DataTypes);
  var iot_devices = _iot_devices(sequelize, DataTypes);
  var job_queue = _job_queue(sequelize, DataTypes);
  var loyalty_point_transactions = _loyalty_point_transactions(sequelize, DataTypes);
  var loyalty_rewards = _loyalty_rewards(sequelize, DataTypes);
  var notification_templates = _notification_templates(sequelize, DataTypes);
  var notifications = _notifications(sequelize, DataTypes);
  var order_items = _order_items(sequelize, DataTypes);
  var orders = _orders(sequelize, DataTypes);
  var payment_methods = _payment_methods(sequelize, DataTypes);
  var product_categories = _product_categories(sequelize, DataTypes);
  var products = _products(sequelize, DataTypes);
  var promotions = _promotions(sequelize, DataTypes);
  var referrals = _referrals(sequelize, DataTypes);
  var reviews = _reviews(sequelize, DataTypes);
  var rider_analytics = _rider_analytics(sequelize, DataTypes);
  var rider_locations = _rider_locations(sequelize, DataTypes);
  var riders = _riders(sequelize, DataTypes);
  var subscription_plans = _subscription_plans(sequelize, DataTypes);
  var support_messages = _support_messages(sequelize, DataTypes);
  var support_tickets = _support_tickets(sequelize, DataTypes);
  var system_events = _system_events(sequelize, DataTypes);
  var system_settings = _system_settings(sequelize, DataTypes);
  var transactions = _transactions(sequelize, DataTypes);
  var user_promotion_usage = _user_promotion_usage(sequelize, DataTypes);
  var user_subscriptions = _user_subscriptions(sequelize, DataTypes);
  var user_wallets = _user_wallets(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var vendor_analytics = _vendor_analytics(sequelize, DataTypes);
  var vendor_inventory = _vendor_inventory(sequelize, DataTypes);
  var vendor_outlets = _vendor_outlets(sequelize, DataTypes);
  var vendors = _vendors(sequelize, DataTypes);
  var wallet_transactions = _wallet_transactions(sequelize, DataTypes);

  notifications.belongsTo(admin_users, { as: "admin", foreignKey: "admin_id"});
  admin_users.hasMany(notifications, { as: "notifications", foreignKey: "admin_id"});
  support_tickets.belongsTo(admin_users, { as: "assigned_admin", foreignKey: "assigned_admin_id"});
  admin_users.hasMany(support_tickets, { as: "support_tickets", foreignKey: "assigned_admin_id"});
  admin_users.belongsTo(auth_accounts, { as: "account", foreignKey: "account_id"});
  auth_accounts.hasOne(admin_users, { as: "admin_user", foreignKey: "account_id"});
  riders.belongsTo(auth_accounts, { as: "account", foreignKey: "account_id"});
  auth_accounts.hasOne(riders, { as: "rider", foreignKey: "account_id"});
  users.belongsTo(auth_accounts, { as: "account", foreignKey: "account_id"});
  auth_accounts.hasOne(users, { as: "user", foreignKey: "account_id"});
  delivery_routes.belongsTo(delivery_assignments, { as: "assignment", foreignKey: "assignment_id"});
  delivery_assignments.hasMany(delivery_routes, { as: "delivery_routes", foreignKey: "assignment_id"});
  notifications.belongsTo(notification_templates, { as: "template", foreignKey: "template_id"});
  notification_templates.hasMany(notifications, { as: "notifications", foreignKey: "template_id"});
  delivery_assignments.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(delivery_assignments, { as: "delivery_assignments", foreignKey: "order_id"});
  order_items.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(order_items, { as: "order_items", foreignKey: "order_id"});
  referrals.belongsTo(orders, { as: "qualification_order", foreignKey: "qualification_order_id"});
  orders.hasMany(referrals, { as: "referrals", foreignKey: "qualification_order_id"});
  reviews.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(reviews, { as: "reviews", foreignKey: "order_id"});
  support_tickets.belongsTo(orders, { as: "related_order", foreignKey: "related_order_id"});
  orders.hasMany(support_tickets, { as: "support_tickets", foreignKey: "related_order_id"});
  transactions.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(transactions, { as: "transactions", foreignKey: "order_id"});
  user_promotion_usage.belongsTo(orders, { as: "order", foreignKey: "order_id"});
  orders.hasMany(user_promotion_usage, { as: "user_promotion_usages", foreignKey: "order_id"});
  transactions.belongsTo(payment_methods, { as: "payment_method", foreignKey: "payment_method_id"});
  payment_methods.hasMany(transactions, { as: "transactions", foreignKey: "payment_method_id"});
  product_categories.belongsTo(product_categories, { as: "parent_category", foreignKey: "parent_category_id"});
  product_categories.hasMany(product_categories, { as: "product_categories", foreignKey: "parent_category_id"});
  products.belongsTo(product_categories, { as: "category", foreignKey: "category_id"});
  product_categories.hasMany(products, { as: "products", foreignKey: "category_id"});
  order_items.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(order_items, { as: "order_items", foreignKey: "product_id"});
  vendor_inventory.belongsTo(products, { as: "product", foreignKey: "product_id"});
  products.hasMany(vendor_inventory, { as: "vendor_inventories", foreignKey: "product_id"});
  user_promotion_usage.belongsTo(promotions, { as: "promotion", foreignKey: "promotion_id"});
  promotions.hasMany(user_promotion_usage, { as: "user_promotion_usages", foreignKey: "promotion_id"});
  delivery_assignments.belongsTo(riders, { as: "rider", foreignKey: "rider_id"});
  riders.hasMany(delivery_assignments, { as: "delivery_assignments", foreignKey: "rider_id"});
  notifications.belongsTo(riders, { as: "rider", foreignKey: "rider_id"});
  riders.hasMany(notifications, { as: "notifications", foreignKey: "rider_id"});
  rider_analytics.belongsTo(riders, { as: "rider", foreignKey: "rider_id"});
  riders.hasMany(rider_analytics, { as: "rider_analytics", foreignKey: "rider_id"});
  rider_locations.belongsTo(riders, { as: "rider", foreignKey: "rider_id"});
  riders.hasMany(rider_locations, { as: "rider_locations", foreignKey: "rider_id"});
  support_tickets.belongsTo(riders, { as: "rider", foreignKey: "rider_id"});
  riders.hasMany(support_tickets, { as: "support_tickets", foreignKey: "rider_id"});
  user_subscriptions.belongsTo(subscription_plans, { as: "plan", foreignKey: "plan_id"});
  subscription_plans.hasMany(user_subscriptions, { as: "user_subscriptions", foreignKey: "plan_id"});
  support_messages.belongsTo(support_tickets, { as: "ticket", foreignKey: "ticket_id"});
  support_tickets.hasMany(support_messages, { as: "support_messages", foreignKey: "ticket_id"});
  wallet_transactions.belongsTo(user_wallets, { as: "wallet", foreignKey: "wallet_id"});
  user_wallets.hasMany(wallet_transactions, { as: "wallet_transactions", foreignKey: "wallet_id"});
  iot_devices.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(iot_devices, { as: "iot_devices", foreignKey: "user_id"});
  loyalty_point_transactions.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(loyalty_point_transactions, { as: "loyalty_point_transactions", foreignKey: "user_id"});
  notifications.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(notifications, { as: "notifications", foreignKey: "user_id"});
  payment_methods.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(payment_methods, { as: "payment_methods", foreignKey: "user_id"});
  referrals.belongsTo(users, { as: "referrer", foreignKey: "referrer_id"});
  users.hasMany(referrals, { as: "referrals", foreignKey: "referrer_id"});
  referrals.belongsTo(users, { as: "referee", foreignKey: "referee_id"});
  users.hasMany(referrals, { as: "referee_referrals", foreignKey: "referee_id"});
  support_tickets.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(support_tickets, { as: "support_tickets", foreignKey: "user_id"});
  transactions.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(transactions, { as: "transactions", foreignKey: "user_id"});
  user_promotion_usage.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_promotion_usage, { as: "user_promotion_usages", foreignKey: "user_id"});
  user_subscriptions.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasMany(user_subscriptions, { as: "user_subscriptions", foreignKey: "user_id"});
  user_wallets.belongsTo(users, { as: "user", foreignKey: "user_id"});
  users.hasOne(user_wallets, { as: "user_wallet", foreignKey: "user_id"});
  inventory_movements.belongsTo(vendor_inventory, { as: "inventory", foreignKey: "inventory_id"});
  vendor_inventory.hasMany(inventory_movements, { as: "inventory_movements", foreignKey: "inventory_id"});
  vendor_inventory.belongsTo(vendor_outlets, { as: "outlet", foreignKey: "outlet_id"});
  vendor_outlets.hasMany(vendor_inventory, { as: "vendor_inventories", foreignKey: "outlet_id"});
  notifications.belongsTo(vendors, { as: "vendor", foreignKey: "vendor_id"});
  vendors.hasMany(notifications, { as: "notifications", foreignKey: "vendor_id"});
  riders.belongsTo(vendors, { as: "vendor", foreignKey: "vendor_id"});
  vendors.hasMany(riders, { as: "riders", foreignKey: "vendor_id"});
  support_tickets.belongsTo(vendors, { as: "vendor", foreignKey: "vendor_id"});
  vendors.hasMany(support_tickets, { as: "support_tickets", foreignKey: "vendor_id"});
  vendor_analytics.belongsTo(vendors, { as: "vendor", foreignKey: "vendor_id"});
  vendors.hasMany(vendor_analytics, { as: "vendor_analytics", foreignKey: "vendor_id"});
  vendor_outlets.belongsTo(vendors, { as: "vendor", foreignKey: "vendor_id"});
  vendors.hasMany(vendor_outlets, { as: "vendor_outlets", foreignKey: "vendor_id"});

  return {
    admin_users,
    audit_logs,
    auth_accounts,
    daily_analytics,
    delivery_assignments,
    delivery_routes,
    inventory_movements,
    iot_devices,
    job_queue,
    loyalty_point_transactions,
    loyalty_rewards,
    notification_templates,
    notifications,
    order_items,
    orders,
    payment_methods,
    product_categories,
    products,
    promotions,
    referrals,
    reviews,
    rider_analytics,
    rider_locations,
    riders,
    subscription_plans,
    support_messages,
    support_tickets,
    system_events,
    system_settings,
    transactions,
    user_promotion_usage,
    user_subscriptions,
    user_wallets,
    users,
    vendor_analytics,
    vendor_inventory,
    vendor_outlets,
    vendors,
    wallet_transactions,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
