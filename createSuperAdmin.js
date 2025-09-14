const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');
const initModels = require('./models/init-models');
const sequelize = require('./config/db');

const models = initModels(sequelize);

async function createSuperAdmin() {
  try {
    // Define admin details
    const email = 'superadmin@example.com';
    const password = 'SuperSecurePassword123!';
    const adminRole = 'super_admin';
    const permissions = [
      'dashboard_access',
      'user_management',
      'order_management',
      'rider_management',
      'vendor_management',
      'product_management',
      'system_settings',
      'audit_logs',
    ];

    // Check if email already exists
    const existingAuth = await models.auth_accounts.findOne({ where: { email } });
    if (existingAuth) {
      console.log('Email already exists:', email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create auth account
    const authAccount = await models.auth_accounts.create({
      role: 'admin',
      email,
      password_hash: hashedPassword,
      is_active: true,
      email_verified: true,
      phone_number: '+1234567890',
      phone_verified: false,
      failed_login_attempts: 0,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Create admin user
    await models.admin_users.create({
      account_id: authAccount.account_id,
      admin_role: adminRole,
      permissions: JSON.stringify(permissions),
      employee_id: 'EMP-SUPER-001',
      department: 'Administration',
      last_active_at: null,
      created_at: new Date(),
    });

    console.log('Super admin created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (err) {
    console.error('Error creating super admin:', err);
  } finally {
    await sequelize.close();
  }
}

createSuperAdmin();