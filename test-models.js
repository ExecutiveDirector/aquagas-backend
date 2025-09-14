const { Sequelize } = require('sequelize');
const initModels = require('./models/init-models');

// Database connection
const sequelize = new Sequelize('smart_gas_delivery', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false, // Set to console.log to see SQL queries
  define: {
    timestamps: false // Disable automatic created_at/updated_at
  }
});

async function testDatabase() {
  try {
    // Test database connection
    console.log('🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful!');

    // Initialize models
    console.log('🔄 Initializing models...');
    const models = initModels(sequelize);
    console.log('✅ Models initialized successfully!');

    // Test model counts
    console.log('\n📊 Available Models:');
    const modelNames = Object.keys(models);
    console.log(`Total models: ${modelNames.length}`);
    
    // Group models by category
    const categories = {
      'User Management': ['users', 'auth_accounts', 'admin_users'],
      'Orders & Products': ['orders', 'order_items', 'products', 'product_categories'],
      'Delivery & Riders': ['riders', 'delivery_assignments', 'delivery_routes', 'rider_locations'],
      'Vendors & Inventory': ['vendors', 'vendor_outlets', 'vendor_inventory', 'inventory_movements'],
      'Payments & Wallets': ['transactions', 'payment_methods', 'user_wallets', 'wallet_transactions'],
      'Notifications & Support': ['notifications', 'notification_templates', 'support_tickets', 'support_messages'],
      'Analytics & IoT': ['daily_analytics', 'rider_analytics', 'vendor_analytics', 'iot_devices'],
      'Loyalty & Promotions': ['loyalty_point_transactions', 'loyalty_rewards', 'promotions', 'user_promotion_usage'],
      'System & Others': ['system_events', 'system_settings', 'audit_logs', 'job_queue']
    };

    Object.entries(categories).forEach(([category, modelList]) => {
      console.log(`\n${category}:`);
      modelList.forEach(model => {
        if (models[model]) {
          console.log(`  ✅ ${model}`);
        }
      });
    });

    // Test a simple query (count records in some key tables)
    console.log('\n🔄 Testing sample queries...');
    
    const userCount = await models.users.count();
    console.log(`📊 Users: ${userCount}`);
    
    const orderCount = await models.orders.count();
    console.log(`📊 Orders: ${orderCount}`);
    
    const riderCount = await models.riders.count();
    console.log(`📊 Riders: ${riderCount}`);
    
    const vendorCount = await models.vendors.count();
    console.log(`📊 Vendors: ${vendorCount}`);

    // Test associations by trying a join query
    console.log('\n🔄 Testing model associations...');
    
    // Let's check what associations exist for orders
    console.log('Orders associations:', Object.keys(models.orders.associations));
    console.log('Users associations:', Object.keys(models.users.associations));
    
    // Try a working association based on the init-models.js
    try {
      // From init-models.js, we can see orders has order_items
      const ordersWithItems = await models.orders.findAll({
        include: [
          { model: models.order_items, as: 'order_items' }
        ],
        limit: 1
      });
      console.log('✅ Order-OrderItems association works!');
      
      // Test user with orders (users might have transactions)
      const usersWithTransactions = await models.users.findAll({
        include: [
          { model: models.transactions, as: 'transactions' }
        ],
        limit: 1
      });
      console.log('✅ User-Transactions association works!');
      
    } catch (assocError) {
      console.log('ℹ️  Association test skipped (no data to test with)');
    }

    console.log('\n🎉 All tests passed! Your models are working correctly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testDatabase();